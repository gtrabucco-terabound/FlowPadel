import type { createClient } from "@/lib/supabase/server";
import type {
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/database.types";

/** Cliente Supabase server-side (RLS aplica sobre él). */
type DB = Awaited<ReturnType<typeof createClient>>;

/**
 * Acceso a datos de las acciones de gestión de un evento. La lógica de dominio
 * (orquestación, validaciones) sigue en app/admin/events/[id]/actions.ts; acá
 * viven solo las consultas, para sacar el `.from()`/`.rpc()` de los actions.
 */

export type EventForActions = Pick<
  Tables<"events">,
  | "id"
  | "club_id"
  | "registration_fee"
  | "currency"
  | "long_format"
  | "charge_court"
  | "inscription_per_person"
  | "court_fee_per_person"
  | "court_pool_per_person"
  | "modality"
  | "category_value"
  | "category_system"
  | "event_type"
  | "start_date"
>;

/** Verifica que el evento sea del club activo; devuelve sus datos o null. */
export async function getEventForActions(
  supabase: DB,
  eventId: string,
  clubId: string
): Promise<EventForActions | null> {
  const { data } = await supabase
    .from("events")
    .select(
      "id, club_id, registration_fee, currency, long_format, charge_court, inscription_per_person, court_fee_per_person, court_pool_per_person, modality, category_value, category_system, event_type, start_date"
    )
    .eq("id", eventId)
    .eq("club_id", clubId)
    .maybeSingle();
  return (data as EventForActions) ?? null;
}

/** Verifica que el pago sea de este evento; devuelve su id o null. */
export async function getPayment(
  supabase: DB,
  eventId: string,
  paymentId: string
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from("payments")
    .select("id")
    .eq("id", paymentId)
    .eq("event_id", eventId)
    .maybeSingle();
  return data ?? null;
}

/* ---- Inscripciones ---- */

export async function getRegistration(
  supabase: DB,
  registrationId: string,
  eventId: string
): Promise<Tables<"registrations"> | null> {
  const { data } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", registrationId)
    .eq("event_id", eventId)
    .maybeSingle();
  return data ?? null;
}

export async function getPlayerGenderCategory(
  supabase: DB,
  playerId: string
): Promise<{ gender: Enums<"gender"> | null; category: number | null } | null> {
  const { data } = await supabase
    .from("players")
    .select("gender, category")
    .eq("id", playerId)
    .maybeSingle();
  return data ?? null;
}

export async function findPlayerByPhoneGC(
  supabase: DB,
  phone: string
): Promise<{
  id: string;
  gender: Enums<"gender"> | null;
  category: number | null;
} | null> {
  const { data } = await supabase
    .from("players")
    .select("id, gender, category")
    .eq("phone", phone)
    .maybeSingle();
  return data ?? null;
}

export async function patchPlayer(
  supabase: DB,
  playerId: string,
  patch: Partial<TablesInsert<"players">>
): Promise<void> {
  await supabase.from("players").update(patch).eq("id", playerId);
}

export async function insertPlayer(
  supabase: DB,
  row: TablesInsert<"players">
): Promise<string | null> {
  const { data, error } = await supabase
    .from("players")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

export async function insertTeam(
  supabase: DB,
  row: TablesInsert<"teams">
): Promise<string | null> {
  const { data, error } = await supabase
    .from("teams")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

export async function updateRegistrationApproved(
  supabase: DB,
  registrationId: string,
  patch: {
    team_id: string;
    player_1_id: string;
    player_2_id: string | null;
  }
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("registrations")
    .update({
      status: "approved",
      team_id: patch.team_id,
      player_1_id: patch.player_1_id,
      player_2_id: patch.player_2_id,
      waitlist_position: null,
    })
    .eq("id", registrationId);
  return { error: Boolean(error) };
}

/** Notifica al jugador el cambio de estado de su inscripción (RPC). */
export async function notifyRegistrationStatus(
  supabase: DB,
  registrationId: string,
  kind: string
): Promise<void> {
  await supabase.rpc("notify_registration_status", {
    p_registration_id: registrationId,
    p_kind: kind,
  });
}

export async function listRegistrationPaymentKinds(
  supabase: DB,
  registrationId: string
): Promise<Enums<"payment_kind">[]> {
  const { data } = await supabase
    .from("payments")
    .select("id, kind")
    .eq("registration_id", registrationId);
  return (data ?? []).map((p) => p.kind as Enums<"payment_kind">);
}

export async function insertPayments(
  supabase: DB,
  rows: TablesInsert<"payments">[]
): Promise<void> {
  if (rows.length === 0) return;
  await supabase.from("payments").insert(rows);
}

/** Actualiza el estado (rechazada / lista de espera) de una inscripción. */
export async function updateRegistrationStatus(
  supabase: DB,
  registrationId: string,
  eventId: string,
  patch: {
    status: Enums<"registration_status">;
    waitlist_position: number | null;
  }
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("registrations")
    .update(patch)
    .eq("id", registrationId)
    .eq("event_id", eventId);
  return { error: Boolean(error) };
}

/* ---- Generación (zonas / fixture / bracket / iniciar torneo) ---- */

type RpcError = { error: boolean; message: string | null };

/** Genera zonas por división (RPC generate_division_zones). */
export async function generateDivisionZones(
  supabase: DB,
  eventId: string
): Promise<RpcError> {
  const { error } = await supabase.rpc("generate_division_zones", {
    p_event_id: eventId,
  });
  return { error: Boolean(error), message: error?.message ?? null };
}

/** Genera el fixture de un americano (parejas rotativas). */
export async function generateAmericano(
  supabase: DB,
  args: {
    eventId: string;
    courts: number;
    startDate?: string;
    rounds?: number;
    firstHour: number;
    slotMinutes: number;
  }
): Promise<RpcError> {
  const { error } = await supabase.rpc("generate_americano", {
    p_event_id: args.eventId,
    p_courts: args.courts,
    p_start_date: args.startDate,
    p_rounds: args.rounds,
    p_first_hour: args.firstHour,
    p_slot_minutes: args.slotMinutes,
  });
  return { error: Boolean(error), message: error?.message ?? null };
}

/** Genera el fixture de una liga larga (round-robin de equipos). */
export async function generateLeagueFixture(
  supabase: DB,
  args: {
    eventId: string;
    courts: number;
    startDate?: string;
    firstHour: number;
    slotMinutes: number;
  }
): Promise<RpcError> {
  const { error } = await supabase.rpc("generate_league", {
    p_event_id: args.eventId,
    p_courts: args.courts,
    p_start_date: args.startDate,
    p_first_hour: args.firstHour,
    p_slot_minutes: args.slotMinutes,
  });
  return { error: Boolean(error), message: error?.message ?? null };
}

/** Genera el cuadro de eliminación sembrando desde las posiciones (RPC). */
export async function generateBracketRpc(
  supabase: DB,
  eventId: string,
  qualifiersPerZone = 2
): Promise<RpcError> {
  const { error } = await supabase.rpc("generate_bracket", {
    p_event_id: eventId,
    p_qualifiers_per_zone: qualifiersPerZone,
  });
  return { error: Boolean(error), message: error?.message ?? null };
}

/** Zonas del evento (ids), para iniciar el torneo. */
export async function listZoneIds(
  supabase: DB,
  eventId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("zones")
    .select("id")
    .eq("event_id", eventId);
  return (data ?? []).map((z) => z.id);
}

/** Partidos de fase de grupos ya existentes (para no duplicar parejas). */
export async function listGroupStageMatchPairs(
  supabase: DB,
  eventId: string
): Promise<{ team_a_id: string; team_b_id: string; zone_id: string | null }[]> {
  const { data } = await supabase
    .from("matches")
    .select("team_a_id, team_b_id, zone_id")
    .eq("event_id", eventId)
    .eq("phase", "group_stage");
  return (data ?? []) as {
    team_a_id: string;
    team_b_id: string;
    zone_id: string | null;
  }[];
}

/** Ids de los equipos de una zona. */
export async function listZoneTeamIds(
  supabase: DB,
  zoneId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("zone_teams")
    .select("team_id")
    .eq("zone_id", zoneId);
  return (data ?? []).map((zt) => zt.team_id);
}

/** Inserta partidos (round-robin al iniciar el torneo). */
export async function insertMatches(
  supabase: DB,
  rows: TablesInsert<"matches">[]
): Promise<{ error: boolean }> {
  if (rows.length === 0) return { error: false };
  const { error } = await supabase.from("matches").insert(rows);
  return { error: Boolean(error) };
}

/** Cambia el estado del evento (ej. in_progress al iniciar). */
export async function updateEventStatus(
  supabase: DB,
  eventId: string,
  status: Enums<"event_status">
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("events")
    .update({ status })
    .eq("id", eventId);
  return { error: Boolean(error) };
}

/** Posición máxima actual en la lista de espera del evento. */
export async function getMaxWaitlistPosition(
  supabase: DB,
  eventId: string
): Promise<number> {
  const { data } = await supabase
    .from("registrations")
    .select("waitlist_position")
    .eq("event_id", eventId)
    .eq("status", "waitlist")
    .order("waitlist_position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.waitlist_position ?? 0;
}

/* ---- Resultados + standings ---- */

export async function getMatchForResult(
  supabase: DB,
  matchId: string,
  eventId: string
): Promise<Pick<
  Tables<"matches">,
  "id" | "team_a_id" | "team_b_id" | "zone_id"
> | null> {
  const { data } = await supabase
    .from("matches")
    .select("id, team_a_id, team_b_id, zone_id")
    .eq("id", matchId)
    .eq("event_id", eventId)
    .maybeSingle();
  return data ?? null;
}

export async function updateMatchResult(
  supabase: DB,
  matchId: string,
  patch: { games_a: number; games_b: number; winner_team_id: string | null }
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("matches")
    .update({ ...patch, status: "completed" })
    .eq("id", matchId);
  return { error: Boolean(error) };
}

export async function recomputeStandingsRpc(
  supabase: DB,
  eventId: string
): Promise<void> {
  await supabase.rpc("recompute_standings", { p_event_id: eventId });
}

/** Recalcula los puntos APA del evento (ranking individual por ronda alcanzada). */
export async function recomputeApaPointsRpc(
  supabase: DB,
  eventId: string
): Promise<void> {
  await supabase.rpc("recompute_apa_points", { p_event_id: eventId });
}

/** ¿Están completos todos los partidos de zona? y ¿ya existe bracket? */
export async function getGroupStageCompletion(
  supabase: DB,
  eventId: string
): Promise<{ allDone: boolean; hasBracket: boolean }> {
  const [{ data: groupMatches }, { data: bracket }] = await Promise.all([
    supabase
      .from("matches")
      .select("status")
      .eq("event_id", eventId)
      .not("zone_id", "is", null),
    supabase.from("brackets").select("id").eq("event_id", eventId).maybeSingle(),
  ]);
  const gm = groupMatches ?? [];
  return {
    allDone: gm.length > 0 && gm.every((m) => m.status === "completed"),
    hasBracket: Boolean(bracket),
  };
}

/** Existe el partido en el evento (para liga). */
export async function matchExistsInEvent(
  supabase: DB,
  matchId: string,
  eventId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("event_id", eventId)
    .maybeSingle();
  return Boolean(data);
}

/** Carga el resultado de un partido de liga (RPC: standings + ELO). */
export async function submitLeagueMatchResult(
  supabase: DB,
  matchId: string,
  gamesA: number,
  gamesB: number
): Promise<RpcError> {
  const { error } = await supabase.rpc("submit_match_result", {
    p_match_id: matchId,
    p_games_a: gamesA,
    p_games_b: gamesB,
  });
  return { error: Boolean(error), message: error?.message ?? null };
}

/* ---- Settings + economía ---- */

/** Actualiza la configuración del evento (Ajustes). */
export async function updateEventSettingsRow(
  supabase: DB,
  eventId: string,
  patch: TablesUpdate<"events">
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", eventId);
  return { error: Boolean(error) };
}

/** Dispara invitaciones automáticas al publicar un evento (RPC). */
export async function generateEventInvites(
  supabase: DB,
  eventId: string
): Promise<void> {
  await supabase.rpc("generate_event_invites", { p_event_id: eventId });
}

/** Inscripciones (id + si tiene pareja) y pagos del evento, para recalcular economía. */
export async function getEventRegistrationsAndPayments(
  supabase: DB,
  eventId: string
): Promise<{
  regs: { id: string; player_2_name: string | null }[];
  pays: {
    id: string;
    registration_id: string | null;
    kind: string;
    amount: number;
    status: string;
  }[];
}> {
  const [{ data: regs }, { data: pays }] = await Promise.all([
    supabase
      .from("registrations")
      .select("id, player_2_name")
      .eq("event_id", eventId),
    supabase
      .from("payments")
      .select("id, registration_id, kind, amount, status")
      .eq("event_id", eventId),
  ]);
  return {
    regs: (regs ?? []) as { id: string; player_2_name: string | null }[],
    pays: (pays ?? []) as {
      id: string;
      registration_id: string | null;
      kind: string;
      amount: number;
      status: string;
    }[],
  };
}

/** Actualiza un pago (recalculo de economía). */
export async function updatePaymentAmounts(
  supabase: DB,
  paymentId: string,
  patch: TablesUpdate<"payments">
): Promise<void> {
  await supabase.from("payments").update(patch).eq("id", paymentId);
}

/* ---- Bloqueo de canchas por torneo ---- */

export async function listCourtsForBlock(
  supabase: DB,
  clubId: string,
  courtIds: string[]
): Promise<
  Pick<
    Tables<"courts">,
    "id" | "name" | "number" | "open_hour" | "close_hour" | "slot_minutes"
  >[]
> {
  const { data } = await supabase
    .from("courts")
    .select("id, name, number, open_hour, close_hour, slot_minutes")
    .eq("club_id", clubId)
    .in("id", courtIds);
  return (data ?? []) as Pick<
    Tables<"courts">,
    "id" | "name" | "number" | "open_hour" | "close_hour" | "slot_minutes"
  >[];
}

export async function listBookingsOnDate(
  supabase: DB,
  date: string,
  courtIds: string[]
): Promise<
  Pick<
    Tables<"court_bookings">,
    "court_id" | "start_minutes" | "slot_minutes" | "status" | "kind"
  >[]
> {
  const { data } = await supabase
    .from("court_bookings")
    .select("court_id, start_minutes, slot_minutes, status, kind")
    .eq("booking_date", date)
    .in("court_id", courtIds)
    .neq("status", "cancelled");
  return (data ?? []) as Pick<
    Tables<"court_bookings">,
    "court_id" | "start_minutes" | "slot_minutes" | "status" | "kind"
  >[];
}

export async function insertCourtBlocks(
  supabase: DB,
  rows: TablesInsert<"court_bookings">[]
): Promise<{ error: boolean }> {
  if (rows.length === 0) return { error: false };
  const { error } = await supabase.from("court_bookings").insert(rows);
  return { error: Boolean(error) };
}

export async function cancelTournamentBlocks(
  supabase: DB,
  eventId: string,
  clubId: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("court_bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("kind", "tournament")
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}

/* ---- Carga manual de inscripción ---- */

export async function insertRegistration(
  supabase: DB,
  row: TablesInsert<"registrations">
): Promise<string | null> {
  const { data, error } = await supabase
    .from("registrations")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}
