"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireClubAccess } from "@/lib/admin/club";
import type { Enums, Tables, TablesInsert } from "@/lib/database.types";

type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

/** Verify the event belongs to the active club; returns club_id or null. */
async function loadEvent(eventId: string) {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select(
      "id, club_id, registration_fee, currency, long_format, charge_court, inscription_per_person, court_fee_per_person, court_pool_per_person, modality, category_value"
    )
    .eq("id", eventId)
    .eq("club_id", clubId)
    .maybeSingle();
  return { supabase, clubId, event };
}

function refresh(eventId: string) {
  revalidatePath(`/admin/events/${eventId}`);
}

/* ------------------------------------------------------------------ */
/* Registrations                                                       */
/* ------------------------------------------------------------------ */

/**
 * Approve a registration: ensure players exist, create a team linking both,
 * mark the registration approved and store the team_id.
 */
export async function approveRegistration(
  eventId: string,
  registrationId: string
): Promise<ActionResult> {
  const { supabase, clubId, event } = await loadEvent(eventId);
  if (!event) return fail("Evento no encontrado.");

  const { data: reg } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", registrationId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!reg) return fail("Inscripción no encontrada.");
  if (reg.team_id) return fail("La inscripción ya tiene equipo.");

  const ensurePlayer = async (
    playerId: string | null,
    name: string | null,
    phone: string | null,
    gender: Tables<"registrations">["player_1_gender"],
    category: Tables<"registrations">["player_1_category"]
  ): Promise<string | null> => {
    if (playerId) {
      // Si el player ya existía, completar gender/category sólo si están nulos.
      if (gender != null || category != null) {
        const { data: existing } = await supabase
          .from("players")
          .select("gender, category")
          .eq("id", playerId)
          .maybeSingle();
        const patch: Partial<TablesInsert<"players">> = {};
        if (existing && existing.gender == null && gender != null)
          patch.gender = gender;
        if (existing && existing.category == null && category != null)
          patch.category = category;
        if (Object.keys(patch).length > 0)
          await supabase.from("players").update(patch).eq("id", playerId);
      }
      return playerId;
    }
    if (!name || !name.trim()) return null;

    // Dedup por teléfono: reusar un player existente con el mismo teléfono en
    // lugar de crear un duplicado. Completa gender/category si estaban nulos.
    const trimmedPhone = phone?.trim() || null;
    if (trimmedPhone) {
      const { data: existingByPhone } = await supabase
        .from("players")
        .select("id, gender, category")
        .eq("phone", trimmedPhone)
        .maybeSingle();
      if (existingByPhone) {
        const patch: Partial<TablesInsert<"players">> = {};
        if (existingByPhone.gender == null && gender != null)
          patch.gender = gender;
        if (existingByPhone.category == null && category != null)
          patch.category = category;
        if (Object.keys(patch).length > 0)
          await supabase.from("players").update(patch).eq("id", existingByPhone.id);
        return existingByPhone.id;
      }
    }

    const { data: player, error } = await supabase
      .from("players")
      .insert({
        full_name: name.trim(),
        phone: phone?.trim() || null,
        home_club_id: clubId,
        gender,
        category,
      } satisfies TablesInsert<"players">)
      .select("id")
      .single();
    if (error || !player) return null;
    return player.id;
  };

  const player1 = await ensurePlayer(
    reg.player_1_id,
    reg.player_1_name,
    reg.player_1_phone,
    reg.player_1_gender,
    reg.player_1_category
  );
  if (!player1) return fail("No pudimos registrar al jugador 1.");
  const player2 = await ensurePlayer(
    reg.player_2_id,
    reg.player_2_name,
    reg.player_2_phone,
    reg.player_2_gender,
    reg.player_2_category
  );

  const teamName =
    reg.player_2_name?.trim()
      ? `${reg.player_1_name} / ${reg.player_2_name}`
      : reg.player_1_name;

  // División del equipo (Bloque M2): en combinado, la modalidad sale de la
  // sub-modalidad elegida en la inscripción; en mono-modalidad, del evento.
  const teamModality: Enums<"tournament_modality"> | null =
    event.modality === "combinado" ? reg.modality : event.modality;

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .insert({
      club_id: clubId,
      event_id: eventId,
      name: teamName,
      player_1_id: player1,
      player_2_id: player2,
      modality: teamModality,
      category_value: event.category_value,
    } satisfies TablesInsert<"teams">)
    .select("id")
    .single();
  if (teamErr || !team) return fail("No pudimos crear el equipo.");

  const { error: updErr } = await supabase
    .from("registrations")
    .update({
      status: "approved",
      team_id: team.id,
      player_1_id: player1,
      player_2_id: player2,
      waitlist_position: null,
    })
    .eq("id", registrationId);
  if (updErr) return fail("No pudimos actualizar la inscripción.");

  // Crear los cobros por equipo (inscripción + cancha). Idempotente: sólo crea
  // los que falten para esta inscripción (no duplica por kind).
  const { data: existingPayments } = await supabase
    .from("payments")
    .select("id, kind")
    .eq("registration_id", registrationId);
  const existingKinds = new Set(
    (existingPayments ?? []).map((p) => p.kind as Enums<"payment_kind">)
  );

  // Cantidad de jugadores: 2 si hay pareja, 1 si single.
  const playersCount = reg.player_2_name?.trim() ? 2 : 1;
  const now = new Date().toISOString();
  const toInsert: TablesInsert<"payments">[] = [];

  if (!existingKinds.has("inscription")) {
    const amount = Number(event.inscription_per_person ?? 0) * playersCount;
    toInsert.push({
      club_id: clubId,
      event_id: eventId,
      registration_id: registrationId,
      kind: "inscription",
      amount,
      pool_amount: 0,
      currency: event.currency,
      status: amount === 0 ? "paid" : "pending",
      provider: "cash",
      paid_at: amount === 0 ? now : null,
    });
  }

  if (event.charge_court && !existingKinds.has("court_fee")) {
    const amount = Number(event.court_fee_per_person ?? 0) * playersCount;
    const pool = Number(event.court_pool_per_person ?? 0) * playersCount;
    toInsert.push({
      club_id: clubId,
      event_id: eventId,
      registration_id: registrationId,
      kind: "court_fee",
      amount,
      pool_amount: pool,
      currency: event.currency,
      status: amount === 0 ? "paid" : "pending",
      provider: "cash",
      paid_at: amount === 0 ? now : null,
    });
  }

  if (toInsert.length > 0) {
    await supabase.from("payments").insert(toInsert);
  }

  refresh(eventId);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Payments / Finanzas                                                 */
/* ------------------------------------------------------------------ */

/** Verify the payment belongs to this event (and the active club). */
async function loadPayment(
  supabase: Awaited<ReturnType<typeof loadEvent>>["supabase"],
  eventId: string,
  paymentId: string
) {
  const { data } = await supabase
    .from("payments")
    .select("id")
    .eq("id", paymentId)
    .eq("event_id", eventId)
    .maybeSingle();
  return data;
}

export async function markPaymentPaid(
  eventId: string,
  paymentId: string
): Promise<ActionResult> {
  const { supabase, event } = await loadEvent(eventId);
  if (!event) return fail("Evento no encontrado.");
  const payment = await loadPayment(supabase, eventId, paymentId);
  if (!payment) return fail("Pago no encontrado.");

  const { error } = await supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", paymentId)
    .eq("event_id", eventId);
  if (error) return fail("No pudimos marcar el pago.");

  refresh(eventId);
  return { ok: true };
}

export async function markPaymentPending(
  eventId: string,
  paymentId: string
): Promise<ActionResult> {
  const { supabase, event } = await loadEvent(eventId);
  if (!event) return fail("Evento no encontrado.");
  const payment = await loadPayment(supabase, eventId, paymentId);
  if (!payment) return fail("Pago no encontrado.");

  const { error } = await supabase
    .from("payments")
    .update({ status: "pending", paid_at: null })
    .eq("id", paymentId)
    .eq("event_id", eventId);
  if (error) return fail("No pudimos actualizar el pago.");

  refresh(eventId);
  return { ok: true };
}

export async function rejectRegistration(
  eventId: string,
  registrationId: string
): Promise<ActionResult> {
  const { supabase, event } = await loadEvent(eventId);
  if (!event) return fail("Evento no encontrado.");
  const { error } = await supabase
    .from("registrations")
    .update({ status: "rejected", waitlist_position: null })
    .eq("id", registrationId)
    .eq("event_id", eventId);
  if (error) return fail("No pudimos rechazar la inscripción.");
  refresh(eventId);
  return { ok: true };
}

export async function waitlistRegistration(
  eventId: string,
  registrationId: string
): Promise<ActionResult> {
  const { supabase, event } = await loadEvent(eventId);
  if (!event) return fail("Evento no encontrado.");

  // Next waitlist position = current max + 1.
  const { data: existing } = await supabase
    .from("registrations")
    .select("waitlist_position")
    .eq("event_id", eventId)
    .eq("status", "waitlist")
    .order("waitlist_position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const next = (existing?.waitlist_position ?? 0) + 1;

  const { error } = await supabase
    .from("registrations")
    .update({ status: "waitlist", waitlist_position: next })
    .eq("id", registrationId)
    .eq("event_id", eventId);
  if (error) return fail("No pudimos mover a lista de espera.");
  refresh(eventId);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Zones                                                               */
/* ------------------------------------------------------------------ */

/**
 * Generate zones por división (Bloque M2): la RPC generate_division_zones
 * agrupa los equipos por modalidad + categoría y crea zonas tagueadas por
 * división ("Caballeros - Zona A", …), asignando los equipos dentro de su
 * división. Funciona igual para una sola modalidad. Reemplaza la generación
 * plana anterior. La RPC limpia las zonas previas del evento.
 */
export async function generateZones(eventId: string): Promise<ActionResult> {
  const { supabase, event } = await loadEvent(eventId);
  if (!event) return fail("Evento no encontrado.");

  const { error } = await supabase.rpc("generate_division_zones", {
    p_event_id: eventId,
  });
  if (error) return fail(error.message || "No pudimos generar las zonas.");

  refresh(eventId);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Matches + standings                                                 */
/* ------------------------------------------------------------------ */

const resultSchema = z.object({
  games_a: z.coerce.number().int().min(0).max(99),
  games_b: z.coerce.number().int().min(0).max(99),
});

/**
 * Record a match result: set games, winner and status=completed.
 * Then recompute standings (via recompute_standings RPC if present,
 * otherwise an inline minimal recompute for the match's zone).
 */
export async function recordMatchResult(
  eventId: string,
  matchId: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = resultSchema.safeParse({
    games_a: formData.get("games_a"),
    games_b: formData.get("games_b"),
  });
  if (!parsed.success) return fail("Resultado inválido.");
  const { games_a, games_b } = parsed.data;
  if (games_a === games_b) return fail("No puede haber empate en games.");

  const { supabase, event } = await loadEvent(eventId);
  if (!event) return fail("Evento no encontrado.");

  const { data: match } = await supabase
    .from("matches")
    .select("id, team_a_id, team_b_id, zone_id")
    .eq("id", matchId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!match) return fail("Partido no encontrado.");

  const winner = games_a > games_b ? match.team_a_id : match.team_b_id;

  const { error } = await supabase
    .from("matches")
    .update({
      games_a,
      games_b,
      winner_team_id: winner,
      status: "completed",
    })
    .eq("id", matchId);
  if (error) return fail("No pudimos guardar el resultado.");

  await recomputeStandings(eventId);

  refresh(eventId);
  return { ok: true };
}

/**
 * Recompute standings for the whole event via the server-side RPC
 * (recompute_standings — 3 pts win / 1 loss, games_diff tiebreak). The RPC is
 * SECURITY DEFINER and authorizes by club membership.
 */
async function recomputeStandings(eventId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("recompute_standings", { p_event_id: eventId });
}

/* ------------------------------------------------------------------ */
/* Liga larga (FASE 2 — jornadas + ranking individual)                 */
/* ------------------------------------------------------------------ */

const leagueSchema = z.object({
  courts: z.coerce.number().int().min(1).max(50),
  startDate: z.string().min(1).nullable(),
  firstHour: z.coerce.number().int().min(0).max(23),
  slotMinutes: z.coerce.number().int().min(15).max(600),
  // Opcional: sólo aplica al americano (cantidad de rondas).
  rounds: z.coerce.number().int().min(1).max(100).nullable(),
});

/**
 * Genera (o regenera) el fixture de una liga larga o de un americano, según el
 * long_format del evento, repartido en jornadas con cancha + horario.
 *   - americano        → RPC generate_americano (parejas rotativas, sin zona).
 *   - liga_*           → RPC generate_league (round-robin de equipos).
 */
export async function generateFixture(
  eventId: string,
  formData: FormData
): Promise<ActionResult> {
  const rawStart = formData.get("start_date");
  const rawRounds = formData.get("rounds");
  const parsed = leagueSchema.safeParse({
    courts: formData.get("courts") ?? 1,
    startDate: rawStart ? String(rawStart) : null,
    firstHour: formData.get("first_hour") ?? 19,
    slotMinutes: formData.get("slot_minutes") ?? 90,
    rounds: rawRounds ? String(rawRounds) : null,
  });
  if (!parsed.success) return fail("Datos inválidos.");

  const { supabase, event } = await loadEvent(eventId);
  if (!event) return fail("Evento no encontrado.");

  if (event.long_format === "americano") {
    const { error } = await supabase.rpc("generate_americano", {
      p_event_id: eventId,
      p_courts: parsed.data.courts,
      p_start_date: parsed.data.startDate ?? undefined,
      p_rounds: parsed.data.rounds ?? undefined,
      p_first_hour: parsed.data.firstHour,
      p_slot_minutes: parsed.data.slotMinutes,
    });
    if (error)
      return fail(error.message || "No pudimos generar el americano.");
    refresh(eventId);
    return { ok: true };
  }

  const { error } = await supabase.rpc("generate_league", {
    p_event_id: eventId,
    p_courts: parsed.data.courts,
    p_start_date: parsed.data.startDate ?? undefined,
    p_first_hour: parsed.data.firstHour,
    p_slot_minutes: parsed.data.slotMinutes,
  });
  if (error) return fail(error.message || "No pudimos generar la liga.");

  refresh(eventId);
  return { ok: true };
}

/** Compat: alias histórico. Usa generateFixture (ramifica por formato). */
export async function generateLeague(
  eventId: string,
  formData: FormData
): Promise<ActionResult> {
  return generateFixture(eventId, formData);
}

/**
 * Carga el resultado de un partido de liga vía submit_match_result, que
 * recalcula standings de equipos + ranking individual + ELO.
 */
export async function recordLeagueResult(
  eventId: string,
  matchId: string,
  gamesA: number,
  gamesB: number
): Promise<ActionResult> {
  const parsed = resultSchema.safeParse({ games_a: gamesA, games_b: gamesB });
  if (!parsed.success) return fail("Resultado inválido.");
  if (parsed.data.games_a === parsed.data.games_b)
    return fail("No puede haber empate en games.");

  const { supabase, event } = await loadEvent(eventId);
  if (!event) return fail("Evento no encontrado.");

  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!match) return fail("Partido no encontrado.");

  const { error } = await supabase.rpc("submit_match_result", {
    p_match_id: matchId,
    p_games_a: parsed.data.games_a,
    p_games_b: parsed.data.games_b,
  });
  if (error) return fail(error.message || "No pudimos guardar el resultado.");

  refresh(eventId);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Bracket / Cuadro de eliminación                                     */
/* ------------------------------------------------------------------ */

/**
 * Genera (o regenera) el cuadro de eliminación sembrando desde las posiciones
 * (top N por zona). Usa la RPC generate_bracket; p_qualifiers_per_zone = 2.
 */
export async function generateBracket(eventId: string): Promise<ActionResult> {
  const { supabase, event } = await loadEvent(eventId);
  if (!event) return fail("Evento no encontrado.");

  const { error } = await supabase.rpc("generate_bracket", {
    p_event_id: eventId,
    p_qualifiers_per_zone: 2,
  });
  if (error) return fail(error.message || "No pudimos generar el cuadro.");

  refresh(eventId);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Settings + start tournament                                         */
/* ------------------------------------------------------------------ */

const settingsSchema = z.object({
  name: z.string().min(2).max(120),
  status: z.enum(["draft", "open", "in_progress", "closed"]),
  public_visible: z.boolean(),
  max_teams: z.coerce.number().int().min(0).max(1024).nullable(),
  registration_fee: z.coerce.number().min(0).max(10_000_000),
  // Validación de formato, no RFC estricto: la FK de Postgres garantiza que la
  // categoría exista. (Evita rechazar uuids válidos para Postgres pero no-RFC.)
  category_id: z.string().min(1).nullable(),
  modality: z
    .enum(["caballeros", "damas", "mixto", "combinado"])
    .nullable(),
  category_system: z.enum(["fixed", "suma"]).nullable(),
  category_value: z.string().max(40).nullable(),
  is_interclub: z.boolean(),
  rival_club_id: z.string().min(1).nullable(),
});

export async function updateEventSettings(
  eventId: string,
  formData: FormData
): Promise<ActionResult> {
  const rawMax = formData.get("max_teams");
  const rawCat = formData.get("category_id");
  const rawModality = formData.get("modality");
  const rawCatSystem = formData.get("category_system");
  const rawCatValue = formData.get("category_value");
  const rawRival = formData.get("rival_club_id");
  const isInterclub = formData.get("is_interclub") === "on";
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    status: formData.get("status"),
    public_visible: formData.get("public_visible") === "on",
    max_teams: rawMax ? Number(rawMax) : null,
    registration_fee: formData.get("registration_fee") ?? 0,
    category_id: rawCat ? String(rawCat) : null,
    modality: rawModality ? String(rawModality) : null,
    category_system: rawCatSystem ? String(rawCatSystem) : null,
    category_value:
      rawCatValue && String(rawCatValue).trim()
        ? String(rawCatValue).trim()
        : null,
    is_interclub: isInterclub,
    rival_club_id: isInterclub && rawRival ? String(rawRival) : null,
  });
  if (!parsed.success) return fail("Datos inválidos.");
  if (parsed.data.is_interclub && !parsed.data.rival_club_id)
    return fail("Elegí el club rival del interclub.");

  const { supabase, event } = await loadEvent(eventId);
  if (!event) return fail("Evento no encontrado.");

  const { error } = await supabase
    .from("events")
    .update({
      name: parsed.data.name.trim(),
      status: parsed.data.status,
      public_visible: parsed.data.public_visible,
      max_teams: parsed.data.max_teams,
      registration_fee: parsed.data.registration_fee,
      category_id: parsed.data.category_id,
      modality: parsed.data.modality,
      category_system: parsed.data.category_system,
      category_value: parsed.data.category_value,
      is_interclub: parsed.data.is_interclub,
      rival_club_id: parsed.data.rival_club_id,
    })
    .eq("id", eventId);
  if (error) return fail("No pudimos guardar los cambios.");

  // Al publicar (Abierto + visible), disparar invitaciones automáticas a los
  // jugadores elegibles (opt-in + género/categoría). Idempotente: no re-encola
  // a quien ya fue invitado (unique event+player).
  if (parsed.data.status === "open" && parsed.data.public_visible) {
    await supabase.rpc("generate_event_invites", { p_event_id: eventId });
  }

  refresh(eventId);
  revalidatePath("/admin/events");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Economics / Planificador (FASE 1 — motor económico)                 */
/* ------------------------------------------------------------------ */

const economicsSchema = z.object({
  long_format: z
    .enum(["liga_ida", "liga_ida_vuelta", "liga_playoff", "americano"])
    .nullable(),
  charge_court: z.boolean(),
  court_cost_month: z.coerce.number().min(0).max(100_000_000),
  matches_per_court_month: z.coerce.number().min(0).max(100_000),
  markup_pct: z.coerce.number().min(0).max(100_000),
  inscription_per_person: z.coerce.number().min(0).max(100_000_000),
  // Cantidad de equipos del Planificador (para calcular cuota de cancha/persona).
  teams: z.coerce.number().int().min(0).max(10_000),
});

/**
 * Partidos totales según el formato (mismo cálculo que el Planificador en el
 * cliente). null = torneo "un día".
 */
function plannerTotalMatches(
  format: z.infer<typeof economicsSchema>["long_format"],
  n: number
): number {
  if (n < 2) return 0;
  switch (format) {
    case null: {
      const zonas = Math.ceil(n / 4);
      const grupos = zonas * 6;
      const clasificados = zonas * 2;
      const playoff = Math.max(0, clasificados - 1);
      return grupos + playoff;
    }
    case "liga_ida":
      return (n * (n - 1)) / 2;
    case "liga_ida_vuelta":
      return n * (n - 1);
    case "liga_playoff":
      return (n * (n - 1)) / 2 + (n - 1);
    case "americano":
      return (n * (n - 1)) / 2;
    default:
      return 0;
  }
}

/**
 * Persist the event's economic configuration (planificador): long_format,
 * court_cost_month, matches_per_court_month, markup_pct, inscription_per_person.
 */
export async function saveEventEconomics(
  eventId: string,
  formData: FormData
): Promise<ActionResult> {
  const rawFormat = formData.get("long_format");
  const parsed = economicsSchema.safeParse({
    long_format: rawFormat ? String(rawFormat) : null,
    charge_court: formData.get("charge_court") === "on",
    court_cost_month: formData.get("court_cost_month") ?? 0,
    matches_per_court_month: formData.get("matches_per_court_month") ?? 0,
    markup_pct: formData.get("markup_pct") ?? 0,
    inscription_per_person: formData.get("inscription_per_person") ?? 0,
    teams: formData.get("teams") ?? 0,
  });
  if (!parsed.success) return fail("Datos inválidos.");

  const { supabase, event } = await loadEvent(eventId);
  if (!event) return fail("Evento no encontrado.");

  // Cuota de cancha por jugador (= costo por jugador × (1 + markup/100)) y la
  // porción de markup que va al pozo (= costo por jugador × markup/100). Misma
  // fórmula que el Planificador. Si no se cobra cancha → ambos en 0.
  const {
    long_format,
    charge_court,
    court_cost_month,
    matches_per_court_month,
    markup_pct,
    teams,
  } = parsed.data;
  const costPerMatch =
    matches_per_court_month > 0 ? court_cost_month / matches_per_court_month : 0;
  const matches = plannerTotalMatches(long_format, teams);
  const players = teams * 2;
  const courtTotal = matches * costPerMatch;
  const courtPerPlayer = players > 0 ? courtTotal / players : 0;
  const courtFeePerPerson = charge_court
    ? courtPerPlayer * (1 + markup_pct / 100)
    : 0;
  const courtPoolPerPerson = charge_court
    ? courtPerPlayer * (markup_pct / 100)
    : 0;

  const { error } = await supabase
    .from("events")
    .update({
      long_format: parsed.data.long_format,
      charge_court: parsed.data.charge_court,
      court_cost_month: parsed.data.court_cost_month,
      matches_per_court_month: parsed.data.matches_per_court_month,
      markup_pct: parsed.data.markup_pct,
      inscription_per_person: parsed.data.inscription_per_person,
      court_fee_per_person: courtFeePerPerson,
      court_pool_per_person: courtPoolPerPerson,
    })
    .eq("id", eventId);
  if (error) return fail("No pudimos guardar la configuración.");

  refresh(eventId);
  return { ok: true };
}

/**
 * Start the tournament: set status=in_progress and generate a round-robin
 * (one match per pair of teams within each zone, phase=group_stage).
 * Requires zones to exist. Skips pairs that already have a match.
 */
export async function startTournament(eventId: string): Promise<ActionResult> {
  const { supabase, clubId, event } = await loadEvent(eventId);
  if (!event) return fail("Evento no encontrado.");

  const { data: zones } = await supabase
    .from("zones")
    .select("id")
    .eq("event_id", eventId);
  const zoneIds = (zones ?? []).map((z) => z.id);
  if (zoneIds.length === 0)
    return fail("Primero generá las zonas del torneo.");

  // Existing group_stage matches to avoid duplicating pairs.
  const { data: existing } = await supabase
    .from("matches")
    .select("team_a_id, team_b_id, zone_id")
    .eq("event_id", eventId)
    .eq("phase", "group_stage");
  const seen = new Set(
    (existing ?? []).map((m) =>
      [m.zone_id, m.team_a_id, m.team_b_id].sort().join("|")
    )
  );

  const inserts: TablesInsert<"matches">[] = [];
  for (const zid of zoneIds) {
    const { data: zoneTeams } = await supabase
      .from("zone_teams")
      .select("team_id")
      .eq("zone_id", zid);
    const ids = (zoneTeams ?? []).map((zt) => zt.team_id);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [zid, ids[i], ids[j]].sort().join("|");
        if (seen.has(key)) continue;
        inserts.push({
          club_id: clubId,
          event_id: eventId,
          zone_id: zid,
          team_a_id: ids[i],
          team_b_id: ids[j],
          phase: "group_stage",
          status: "scheduled",
        });
      }
    }
  }

  if (inserts.length > 0) {
    const { error: insErr } = await supabase.from("matches").insert(inserts);
    if (insErr) return fail("No pudimos generar los partidos.");
  }

  const { error: statusErr } = await supabase
    .from("events")
    .update({ status: "in_progress" })
    .eq("id", eventId);
  if (statusErr) return fail("No pudimos iniciar el torneo.");

  refresh(eventId);
  revalidatePath("/admin/events");
  return { ok: true };
}
