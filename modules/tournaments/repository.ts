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
