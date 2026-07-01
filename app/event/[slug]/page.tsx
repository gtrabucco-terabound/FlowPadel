import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EventDetailTabs,
  type EventDetailData,
} from "@/components/event-detail-tabs";
import {
  eventStatusMeta,
  eventTypeLabel,
  formatDateRange,
  formatModalityCategory,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, slug, description, event_type, status, start_date, end_date, public_visible, long_format, modality, category_system, category_value, is_interclub, rival_club_id, rival_accepted, club:clubs!events_club_id_fkey(name)"
    )
    .eq("slug", slug)
    .eq("public_visible", true)
    .maybeSingle();

  if (!event) notFound();

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
      supabase
        .from("teams")
        .select("id, name")
        .eq("event_id", event.id),
      supabase
        .from("brackets")
        .select("id")
        .eq("event_id", event.id),
    ]);

  const eventTeamIds = new Set((teamsRes.data ?? []).map((t) => t.id));
  const standings = (standingsRes.data ?? []).filter((s) =>
    eventTeamIds.has(s.team_id)
  );

  // FASE 2 (liga larga): jornadas, ranking individual, canchas y jugadores.
  const isLeague = event.long_format != null;
  const isAmericano = event.long_format === "americano";
  let rounds: EventDetailData["rounds"] = [];
  let playerStandings: EventDetailData["playerStandings"] = [];
  let players: EventDetailData["players"] = [];
  let courts: EventDetailData["courts"] = [];
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
    rounds = roundsRes.data ?? [];
    playerStandings = psRes.data ?? [];
    courts = courtsRes.data ?? [];

    const playerIds = Array.from(
      new Set(playerStandings.map((p) => p.player_id))
    );
    if (playerIds.length > 0) {
      const { data: pl } = await supabase
        .from("players")
        .select("id, full_name")
        .in("id", playerIds);
      players = pl ?? [];
    }
  }

  const status = eventStatusMeta(event.status);
  const club = (event as { club?: { name: string | null } | null }).club;

  // Interclub: resolver el nombre del club rival para la cabecera.
  let rivalClubName: string | null = null;
  if (event.is_interclub && event.rival_club_id) {
    const { data: rival } = await supabase
      .from("clubs")
      .select("name")
      .eq("id", event.rival_club_id)
      .maybeSingle();
    rivalClubName = rival?.name ?? null;
  }

  const detailData: EventDetailData = {
    eventId: event.id,
    zones: zonesRes.data ?? [],
    matches: matchesRes.data ?? [],
    standings,
    teams: teamsRes.data ?? [],
    hasBrackets: (bracketsRes.data ?? []).length > 0,
    isLeague,
    isAmericano,
    isCombinado: event.modality === "combinado",
    rounds,
    playerStandings,
    players,
    courts,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/"
        className="text-sm font-semibold text-padel-600 hover:text-padel-700"
      >
        ← Volver
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-padel-600">
          {eventTypeLabel(event.event_type)}
        </span>
        <Badge tone={status.tone}>{status.label}</Badge>
        {formatModalityCategory(event) && (
          <Badge tone="neutral">{formatModalityCategory(event)}</Badge>
        )}
        {event.is_interclub && <Badge tone="live">Interclub</Badge>}
      </div>

      {event.is_interclub && (
        <p className="mt-2 text-sm font-semibold text-padel-700">
          Organiza: {club?.name ?? "Club"} · Rival: {rivalClubName ?? "Por confirmar"}
          {event.rival_accepted ? "" : " (desafío pendiente)"}
        </p>
      )}

      <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
        {event.name}
      </h1>
      <p className="mt-1 text-muted">
        {formatDateRange(event.start_date, event.end_date)}
        {club?.name ? ` · ${club.name}` : ""}
      </p>
      {event.description && (
        <p className="mt-3 text-muted">{event.description}</p>
      )}

      {event.status === "open" && (
        <Link href={`/register/${event.slug}`} className="mt-4 inline-block">
          <Button>Inscribirme</Button>
        </Link>
      )}

      <div className="mt-8">
        <EventDetailTabs data={detailData} />
      </div>
    </div>
  );
}
