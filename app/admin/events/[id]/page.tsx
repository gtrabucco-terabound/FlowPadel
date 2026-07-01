import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { eventStatusMeta, eventTypeLabel, formatDate } from "@/lib/format";
import { EventManager } from "@/components/admin/event-manager";
import type { Tables } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("club_id", ctx.activeClubId)
    .maybeSingle();

  if (!event) notFound();

  const [
    { data: registrations },
    { data: teams },
    { data: zones },
    { data: matches },
    { data: categories },
    { data: payments },
  ] = await Promise.all([
    supabase
      .from("registrations")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("teams")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("zones")
      .select("*")
      .eq("event_id", id)
      .order("name", { ascending: true }),
    supabase
      .from("matches")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name")
      .eq("club_id", ctx.activeClubId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("payments")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true }),
  ]);

  // FASE 2 (liga larga): jornadas, ranking individual y canchas (para horarios).
  const [{ data: rounds }, { data: playerStandings }, { data: courts }] =
    await Promise.all([
    supabase
      .from("rounds")
      .select("*")
      .eq("event_id", id)
      .order("number", { ascending: true }),
    supabase
      .from("player_standings")
      .select("*")
      .eq("event_id", id)
      .order("position", { ascending: true, nullsFirst: false }),
    supabase
      .from("courts")
      .select("id, name")
      .eq("club_id", ctx.activeClubId),
  ]);

  // Clubs disponibles como rival (todos menos el organizador) para Ajustes interclub.
  const { data: clubData } = await supabase
    .from("clubs")
    .select("id, name")
    .neq("id", ctx.activeClubId)
    .order("name", { ascending: true });
  const rivalClubs = (clubData ?? []) as { id: string; name: string }[];

  // Jugadores para resolver nombres del ranking (sin joins anidados sobre
  // player_standings, cuyos Relationships están vacíos en los tipos).
  const playerIds = Array.from(
    new Set((playerStandings ?? []).map((p) => p.player_id))
  );
  let players: Pick<Tables<"players">, "id" | "full_name">[] = [];
  if (playerIds.length > 0) {
    const { data: pl } = await supabase
      .from("players")
      .select("id, full_name")
      .in("id", playerIds);
    players = (pl ?? []) as Pick<Tables<"players">, "id" | "full_name">[];
  }

  const zoneIds = (zones ?? []).map((z) => z.id);
  let zoneTeams: Tables<"zone_teams">[] = [];
  if (zoneIds.length > 0) {
    const { data: zt } = await supabase
      .from("zone_teams")
      .select("*")
      .in("zone_id", zoneIds);
    zoneTeams = (zt ?? []) as Tables<"zone_teams">[];
  }

  const meta = eventStatusMeta(event.status);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/events"
          className="text-sm font-semibold text-padel-600 hover:text-padel-700"
        >
          ← Eventos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">{event.name}</h1>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
        <p className="text-sm text-muted">
          {eventTypeLabel(event.event_type)} · {formatDate(event.start_date)}
        </p>
      </div>

      <EventManager
        data={{
          event,
          registrations: registrations ?? [],
          teams: teams ?? [],
          zones: zones ?? [],
          zoneTeams,
          matches: matches ?? [],
          categories: categories ?? [],
          payments: payments ?? [],
          rounds: rounds ?? [],
          playerStandings: playerStandings ?? [],
          players,
          courts: courts ?? [],
          rivalClubs,
        }}
      />
    </div>
  );
}
