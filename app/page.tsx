import { createClient } from "@/lib/supabase/server";
import {
  EventsGridRealtime,
} from "@/components/events-grid-realtime";
import type { EventCardData } from "@/components/event-card";
import { TopRanking, type TopRankingPlayer } from "@/components/top-ranking";
import { listTopPlayersWithClub } from "@/modules/ranking/repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data }, topPlayersRaw] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, name, slug, event_type, status, start_date, end_date, modality, category_system, category_value, club:clubs!events_club_id_fkey(name)"
      )
      .eq("public_visible", true)
      .neq("status", "draft")
      .order("start_date", { ascending: true, nullsFirst: false }),
    listTopPlayersWithClub(supabase, 6),
  ]);

  const events = (data ?? []) as unknown as EventCardData[];

  const topPlayers: TopRankingPlayer[] = topPlayersRaw.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    elo_rating: p.elo_rating,
    club_name: p.club?.name ?? null,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="py-14 sm:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-border-soft bg-surface px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="fp-microlabel">FlowPadel</span>
        </span>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Jugá, competí y seguí tu ranking
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          Inscribite a torneos y canchas abiertas, seguí los resultados en vivo
          y mirá cómo evoluciona tu ranking.
        </p>
      </section>

      <section className="pb-8">
        <h2 className="mb-5 text-xl font-semibold text-ink">Próximos eventos</h2>
        <EventsGridRealtime initialEvents={events} />
      </section>

      <TopRanking players={topPlayers} />
    </div>
  );
}
