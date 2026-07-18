import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

/** Cliente Supabase server-side (RLS aplica sobre él). */
type DB = Awaited<ReturnType<typeof createClient>>;

/**
 * NOTA: este módulo, por ahora, sólo encapsula LECTURAS de eventos/torneos
 * (listados públicos, calendario, dashboard). La gestión pesada de un torneo
 * (zonas, fixture, bracket, ELO, economía) sigue en `app/admin/events/[id]/`
 * y se migrará cuando tenga cobertura E2E propia.
 */

/* ---- Creación y listado de eventos del club ---- */

export type NewDraftEvent = {
  clubId: string;
  name: string;
  slug: string;
  eventType: "tournament" | "open_play";
  startDate: string | null;
  modality: Tables<"events">["modality"];
  categorySystem: Tables<"events">["category_system"];
  categoryValue: string | null;
  isInterclub: boolean;
  rivalClubId: string | null;
};

/** ¿Existe ya un evento con ese slug? (slug se usa en rutas públicas). */
export async function slugExists(
  supabase: DB,
  slug: string
): Promise<boolean> {
  const { data } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return Boolean(data);
}

/** Crea un evento borrador. Devuelve su id. */
export async function createDraftEvent(
  supabase: DB,
  e: NewDraftEvent
): Promise<string | null> {
  const { data, error } = await supabase
    .from("events")
    .insert({
      club_id: e.clubId,
      name: e.name,
      slug: e.slug,
      event_type: e.eventType,
      status: "draft",
      start_date: e.startDate,
      modality: e.modality,
      category_system: e.categorySystem,
      category_value: e.categoryValue,
      is_interclub: e.isInterclub,
      rival_club_id: e.rivalClubId,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

/** Acepta un desafío interclub (RPC autoriza por admin del club rival). */
export async function acceptInterclub(
  supabase: DB,
  eventId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("accept_interclub", {
    p_event_id: eventId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type ClubEventListRow = Pick<
  Tables<"events">,
  "id" | "name" | "slug" | "status" | "start_date" | "event_type" | "max_teams"
>;

/** Eventos del club para el listado del panel. */
export async function listClubEvents(
  supabase: DB,
  clubId: string
): Promise<ClubEventListRow[]> {
  const { data } = await supabase
    .from("events")
    .select("id, name, slug, status, start_date, event_type, max_teams")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ClubEventListRow[];
}

export type InterclubChallenge = {
  id: string;
  name: string;
  startDate: string | null;
  organizerName: string;
};

/** Desafíos interclub recibidos por el club (nos retan y no aceptamos aún). */
export async function listInterclubChallenges(
  supabase: DB,
  clubId: string
): Promise<InterclubChallenge[]> {
  const { data } = await supabase
    .from("events")
    .select("id, name, slug, start_date, modality, club_id")
    .eq("rival_club_id", clubId)
    .eq("is_interclub", true)
    .eq("rival_accepted", false)
    .order("created_at", { ascending: false });
  const challenges = (data ?? []) as Array<{
    id: string;
    name: string;
    start_date: string | null;
    club_id: string;
  }>;

  const organizerIds = Array.from(new Set(challenges.map((c) => c.club_id)));
  const names = new Map<string, string>();
  if (organizerIds.length > 0) {
    const { data: orgs } = await supabase
      .from("clubs")
      .select("id, name")
      .in("id", organizerIds);
    for (const o of (orgs ?? []) as { id: string; name: string }[]) {
      names.set(o.id, o.name);
    }
  }
  return challenges.map((c) => ({
    id: c.id,
    name: c.name,
    startDate: c.start_date,
    organizerName: names.get(c.club_id) ?? "Club",
  }));
}

/* ---- Detalle público del evento (/event/[slug]) ---- */

export type PublicEventMeta = {
  name: string;
  description: string | null;
  modality: Tables<"events">["modality"];
  category_system: Tables<"events">["category_system"];
  category_value: string | null;
  club: { name: string | null; logo_url: string | null } | null;
};

/** Datos del evento para las metatags (generateMetadata). */
export async function getPublicEventMeta(
  supabase: DB,
  slug: string
): Promise<PublicEventMeta | null> {
  const { data } = await supabase
    .from("events")
    .select(
      "name, description, modality, category_system, category_value, club:clubs!events_club_id_fkey(name, logo_url)"
    )
    .eq("slug", slug)
    .eq("public_visible", true)
    .maybeSingle();
  return (data as unknown as PublicEventMeta) ?? null;
}

export type PublicEventDetailEvent = Pick<
  Tables<"events">,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "event_type"
  | "status"
  | "start_date"
  | "end_date"
  | "public_visible"
  | "long_format"
  | "modality"
  | "category_system"
  | "category_value"
  | "venue"
  | "is_interclub"
  | "rival_club_id"
  | "rival_accepted"
> & {
  club: {
    name: string | null;
    logo_url: string | null;
    city: string | null;
    address: string | null;
    phone: string | null;
    contact_email: string | null;
    instagram: string | null;
    website: string | null;
    description: string | null;
  } | null;
};

export type PublicEventDetail = {
  event: PublicEventDetailEvent;
  rivalClubName: string | null;
  zones: Tables<"zones">[];
  matches: Tables<"matches">[];
  standings: Tables<"standings">[];
  teams: Pick<Tables<"teams">, "id" | "name">[];
  hasBrackets: boolean;
  rounds: Tables<"rounds">[];
  playerStandings: Tables<"player_standings">[];
  players: Pick<Tables<"players">, "id" | "full_name">[];
  courts: Pick<Tables<"courts">, "id" | "name">[];
};

/**
 * Detalle completo de un evento público por slug: evento + club, fase de grupos
 * (zonas/partidos/posiciones/equipos/bracket), fase de liga (jornadas, ranking
 * individual, canchas, jugadores) y el nombre del club rival si es interclub.
 */
export async function getPublicEventDetail(
  supabase: DB,
  slug: string
): Promise<PublicEventDetail | null> {
  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, slug, description, event_type, status, start_date, end_date, public_visible, long_format, modality, category_system, category_value, venue, is_interclub, rival_club_id, rival_accepted, club:clubs!events_club_id_fkey(name, logo_url, city, address, phone, contact_email, instagram, website, description)"
    )
    .eq("slug", slug)
    .eq("public_visible", true)
    .maybeSingle();

  if (!event) return null;

  const [zonesRes, matchesRes, standingsRes, teamsRes, bracketsRes] =
    await Promise.all([
      supabase.from("zones").select("*").eq("event_id", event.id),
      supabase
        .from("matches")
        .select("*")
        .eq("event_id", event.id)
        .order("scheduled_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("standings")
        .select("*")
        .order("points", { ascending: false }),
      supabase.from("teams").select("id, name").eq("event_id", event.id),
      supabase.from("brackets").select("id").eq("event_id", event.id),
    ]);

  const eventTeamIds = new Set((teamsRes.data ?? []).map((t) => t.id));
  const standings = (standingsRes.data ?? []).filter((s) =>
    eventTeamIds.has(s.team_id)
  );

  const isLeague = event.long_format != null;
  let rounds: Tables<"rounds">[] = [];
  let playerStandings: Tables<"player_standings">[] = [];
  let players: Pick<Tables<"players">, "id" | "full_name">[] = [];
  let courts: Pick<Tables<"courts">, "id" | "name">[] = [];
  if (isLeague) {
    const [roundsRes, psRes, courtsRes] = await Promise.all([
      supabase
        .from("rounds")
        .select("*")
        .eq("event_id", event.id)
        .order("number", { ascending: true }),
      supabase
        .from("player_standings")
        .select("*")
        .eq("event_id", event.id)
        .order("position", { ascending: true, nullsFirst: false }),
      supabase.from("courts").select("id, name"),
    ]);
    rounds = (roundsRes.data ?? []) as Tables<"rounds">[];
    playerStandings = (psRes.data ?? []) as Tables<"player_standings">[];
    courts = (courtsRes.data ?? []) as Pick<Tables<"courts">, "id" | "name">[];

    const playerIds = Array.from(
      new Set(playerStandings.map((p) => p.player_id))
    );
    if (playerIds.length > 0) {
      const { data: pl } = await supabase
        .from("players")
        .select("id, full_name")
        .in("id", playerIds);
      players = (pl ?? []) as Pick<Tables<"players">, "id" | "full_name">[];
    }
  }

  let rivalClubName: string | null = null;
  if (event.is_interclub && event.rival_club_id) {
    const { data: rival } = await supabase
      .from("clubs")
      .select("name")
      .eq("id", event.rival_club_id)
      .maybeSingle();
    rivalClubName = rival?.name ?? null;
  }

  return {
    event: event as unknown as PublicEventDetail["event"],
    rivalClubName,
    zones: (zonesRes.data ?? []) as Tables<"zones">[],
    matches: (matchesRes.data ?? []) as Tables<"matches">[],
    standings: standings as Tables<"standings">[],
    teams: (teamsRes.data ?? []) as Pick<Tables<"teams">, "id" | "name">[],
    hasBrackets: (bracketsRes.data ?? []).length > 0,
    rounds,
    playerStandings,
    players,
    courts,
  };
}

export type EventFlyerData = {
  name: string;
  modality: Tables<"events">["modality"];
  category_system: Tables<"events">["category_system"];
  category_value: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  flyer_image_url: string | null;
  inscription_per_person: number | null;
  club: { name: string | null; logo_url: string | null } | null;
};

/** Datos de un evento para su flyer OG (imagen para compartir). */
export async function getEventFlyerData(
  supabase: DB,
  slug: string
): Promise<EventFlyerData | null> {
  const { data } = await supabase
    .from("events")
    .select(
      "name, modality, category_system, category_value, start_date, end_date, venue, flyer_image_url, inscription_per_person, club:clubs!events_club_id_fkey(name, logo_url)"
    )
    .eq("slug", slug)
    .eq("public_visible", true)
    .maybeSingle();
  return (data as unknown as EventFlyerData) ?? null;
}

export type OpenTournamentFlyerRow = {
  name: string;
  start_date: string | null;
  category_value: string | null;
  modality: string | null;
  club: { name: string | null } | null;
};

/** Próximos torneos abiertos para el flyer de /torneos/flyer. */
export async function listOpenTournamentsForFlyer(
  supabase: DB,
  limit = 6
): Promise<OpenTournamentFlyerRow[]> {
  const { data } = await supabase
    .from("events")
    .select(
      "name, start_date, category_value, modality, club:clubs!events_club_id_fkey(name)"
    )
    .eq("public_visible", true)
    .eq("status", "open")
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as unknown as OpenTournamentFlyerRow[];
}

/** Eventos públicos (todos los tipos, no borrador) para la home. */
export async function listPublicHomeEvents(
  supabase: DB
): Promise<unknown[]> {
  const { data } = await supabase
    .from("events")
    .select(
      "id, name, slug, event_type, status, start_date, end_date, modality, category_system, category_value, club:clubs!events_club_id_fkey(name)"
    )
    .eq("public_visible", true)
    .neq("status", "draft")
    .order("start_date", { ascending: true, nullsFirst: false });
  return (data ?? []) as unknown[];
}

/* ---- Inscripción pública ---- */

export type PublicEventForRegistration = Pick<
  Tables<"events">,
  | "id"
  | "name"
  | "slug"
  | "event_type"
  | "status"
  | "start_date"
  | "end_date"
  | "public_visible"
  | "modality"
  | "category_system"
  | "category_value"
  | "max_teams"
>;

/** Evento público (visible) por slug, para la página de inscripción. */
export async function getPublicEventForRegistration(
  supabase: DB,
  slug: string
): Promise<PublicEventForRegistration | null> {
  const { data } = await supabase
    .from("events")
    .select(
      "id, name, slug, event_type, status, start_date, end_date, public_visible, modality, category_system, category_value, max_teams"
    )
    .eq("slug", slug)
    .eq("public_visible", true)
    .maybeSingle();
  return (data as PublicEventForRegistration) ?? null;
}

/** Cantidad de inscripciones aprobadas de un evento (para el cupo). */
export async function getEventApprovedCount(
  supabase: DB,
  eventId: string
): Promise<number> {
  const { data } = await supabase.rpc("event_approved_count", {
    p_event_id: eventId,
  });
  return (data ?? 0) as number;
}

/** Torneos públicos de la comunidad (para /torneos). */
export async function listPublicTournaments(supabase: DB): Promise<unknown[]> {
  const { data } = await supabase
    .from("events")
    .select(
      "id, name, slug, event_type, status, start_date, end_date, modality, category_system, category_value, club:clubs!events_club_id_fkey(id, name, city)"
    )
    .eq("public_visible", true)
    .eq("event_type", "tournament")
    .neq("status", "draft")
    .order("start_date", { ascending: false, nullsFirst: false });
  return (data ?? []) as unknown[];
}

export type CalendarEvent = Pick<
  Tables<"events">,
  "id" | "name" | "slug" | "status" | "start_date" | "end_date" | "venue"
>;

/** Eventos del club para el calendario. */
export async function listClubCalendarEvents(
  supabase: DB,
  clubId: string
): Promise<CalendarEvent[]> {
  const { data } = await supabase
    .from("events")
    .select("id, name, slug, status, start_date, end_date, venue")
    .eq("club_id", clubId)
    .order("start_date", { ascending: true, nullsFirst: false });
  return (data ?? []) as CalendarEvent[];
}

export type DashboardEvent = Pick<
  Tables<"events">,
  "id" | "name" | "slug" | "status" | "start_date" | "event_type"
>;

/** Resumen de invitaciones automáticas por torneo del club (Prospectos). */
export async function listClubEventInvites(
  supabase: DB,
  clubId: string
): Promise<{ name: string; total: number }[]> {
  const { data } = await supabase
    .from("tournament_invites")
    .select("id, status, event:events!inner(id, name, club_id)")
    .eq("event.club_id", clubId);

  const invites = (data ?? []) as unknown as Array<{
    event: { id: string; name: string } | null;
  }>;
  const byEvent = new Map<string, { name: string; total: number }>();
  for (const inv of invites) {
    if (!inv.event) continue;
    const cur = byEvent.get(inv.event.id) ?? { name: inv.event.name, total: 0 };
    cur.total += 1;
    byEvent.set(inv.event.id, cur);
  }
  return [...byEvent.values()].sort((a, b) => b.total - a.total);
}

export type ProjectionEvent = Pick<
  Tables<"events">,
  | "id"
  | "name"
  | "slug"
  | "status"
  | "start_date"
  | "modality"
  | "long_format"
  | "max_teams"
  | "inscription_per_person"
  | "court_cost_month"
  | "court_pool_per_person"
  | "currency"
>;

/** Eventos del club con sus columnas económicas (proyección anual). */
export async function listClubProjectionEvents(
  supabase: DB,
  clubId: string
): Promise<ProjectionEvent[]> {
  const { data } = await supabase
    .from("events")
    .select(
      "id, name, slug, status, start_date, modality, long_format, max_teams, inscription_per_person, court_cost_month, court_pool_per_person, currency"
    )
    .eq("club_id", clubId)
    .order("start_date", { ascending: false, nullsFirst: false });
  return (data ?? []) as ProjectionEvent[];
}

/**
 * Agregados por evento para la proyección: equipos aprobados, recaudado y pozo
 * (solo pagos `paid`). Se calcula sobre un conjunto de eventos.
 */
export async function getProjectionAggregates(
  supabase: DB,
  eventIds: string[]
): Promise<{
  teamsByEvent: Map<string, number>;
  collectedByEvent: Map<string, number>;
  poolByEvent: Map<string, number>;
}> {
  const teamsByEvent = new Map<string, number>();
  const collectedByEvent = new Map<string, number>();
  const poolByEvent = new Map<string, number>();
  if (eventIds.length === 0) {
    return { teamsByEvent, collectedByEvent, poolByEvent };
  }

  const [{ data: teamData }, { data: payData }] = await Promise.all([
    supabase.from("teams").select("event_id").in("event_id", eventIds),
    supabase
      .from("payments")
      .select("event_id, amount, pool_amount, status")
      .in("event_id", eventIds),
  ]);

  for (const t of (teamData ?? []) as { event_id: string }[]) {
    teamsByEvent.set(t.event_id, (teamsByEvent.get(t.event_id) ?? 0) + 1);
  }
  for (const p of (payData ?? []) as Array<{
    event_id: string | null;
    amount: number;
    pool_amount: number;
    status: string;
  }>) {
    if (p.status !== "paid" || !p.event_id) continue;
    collectedByEvent.set(
      p.event_id,
      (collectedByEvent.get(p.event_id) ?? 0) + Number(p.amount)
    );
    poolByEvent.set(
      p.event_id,
      (poolByEvent.get(p.event_id) ?? 0) + Number(p.pool_amount)
    );
  }
  return { teamsByEvent, collectedByEvent, poolByEvent };
}

/** Eventos recientes del club + conteo de inscripciones pendientes (dashboard). */
export async function getClubDashboard(
  supabase: DB,
  clubId: string
): Promise<{ events: DashboardEvent[]; pendingCount: number }> {
  const [{ data: events }, { count }] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, slug, status, start_date, event_type")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false }),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "pending"),
  ]);
  return {
    events: (events ?? []) as DashboardEvent[],
    pendingCount: count ?? 0,
  };
}
