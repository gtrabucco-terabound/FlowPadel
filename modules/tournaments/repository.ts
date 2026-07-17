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
