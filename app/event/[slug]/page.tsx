import Link from "next/link";
import Image from "next/image";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("events")
    .select(
      "name, description, modality, category_system, category_value, club:clubs!events_club_id_fkey(name, logo_url)"
    )
    .eq("slug", slug)
    .eq("public_visible", true)
    .maybeSingle();

  if (!ev) return { title: "FlowPadel" };
  const club = (ev as { club?: { name: string | null; logo_url: string | null } | null }).club;
  const meta = formatModalityCategory(ev);
  const title = `${ev.name}${club?.name ? " · " + club.name : ""} — FlowPadel`;
  const description =
    ev.description ||
    `${meta ? meta + ". " : ""}Inscribite a este torneo en FlowPadel.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website" as const,
      images: club?.logo_url ? [{ url: club.logo_url }] : undefined,
    },
    twitter: {
      card: "summary" as const,
      title,
      description,
    },
  };
}

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
      "id, name, slug, description, event_type, status, start_date, end_date, public_visible, long_format, modality, category_system, category_value, venue, is_interclub, rival_club_id, rival_accepted, club:clubs!events_club_id_fkey(name, logo_url, city, address, phone, contact_email, instagram, website, description)"
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
  const club = (
    event as {
      club?: {
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
    }
  ).club;

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
      {event.venue && (
        <p className="mt-1 text-sm font-medium text-ink">📍 {event.venue}</p>
      )}
      {event.description && (
        <p className="mt-3 text-muted">{event.description}</p>
      )}

      {event.status === "open" && (
        <Link href={`/register/${event.slug}`} className="mt-4 inline-block">
          <Button>Inscribirme</Button>
        </Link>
      )}

      {club && (
        <div className="mt-6 rounded-2xl border border-border-soft bg-surface p-4">
          <div className="flex items-start gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border-soft bg-canvas">
              {club.logo_url ? (
                <Image
                  src={club.logo_url}
                  alt={club.name ?? "Club"}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg text-faint">
                  🏆
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{club.name}</p>
              {(club.address || club.city) && (
                <p className="text-sm text-muted">
                  {[club.address, club.city].filter(Boolean).join(" · ")}
                </p>
              )}
              {club.description && (
                <p className="mt-1 text-sm text-muted">{club.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {club.phone && (
                  <a
                    href={`https://wa.me/${club.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-padel-600"
                  >
                    📱 {club.phone}
                  </a>
                )}
                {club.contact_email && (
                  <a href={`mailto:${club.contact_email}`} className="font-medium text-padel-600">
                    ✉️ {club.contact_email}
                  </a>
                )}
                {club.instagram && (
                  <a
                    href={`https://instagram.com/${club.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-padel-600"
                  >
                    📷 {club.instagram}
                  </a>
                )}
                {club.website && (
                  <a
                    href={club.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-padel-600"
                  >
                    🌐 Sitio web
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <EventDetailTabs data={detailData} />
      </div>
    </div>
  );
}
