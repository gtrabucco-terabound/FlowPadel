import { createClient } from "@/lib/supabase/server";
import { RankingList, type RankingPlayer } from "@/components/ranking-list";
import {
  ClubRankingList,
  type ClubRankingRow,
} from "@/components/club-ranking-list";
import { RankingTabs } from "@/components/ranking-tabs";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const supabase = await createClient();

  const [{ data: playersData }, { data: clubRankingData }, { data: clubsData }] =
    await Promise.all([
      supabase
        .from("players")
        .select("id, full_name, elo_rating, matches_played, matches_won")
        .order("elo_rating", { ascending: false })
        .limit(50),
      supabase.rpc("club_ranking"),
      supabase.from("clubs").select("id, city"),
    ]);

  const players = (playersData ?? []) as RankingPlayer[];

  const cityById = new Map<string, string | null>(
    (clubsData ?? []).map((c) => [c.id, c.city])
  );

  const clubs: ClubRankingRow[] = (clubRankingData ?? []).map((c) => ({
    club_id: c.club_id,
    club_name: c.club_name,
    city: cityById.get(c.club_id) ?? null,
    total_points: c.total_points,
    players_count: c.players_count,
    tournaments_count: c.tournaments_count,
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-ink">Ranking</h1>
      <p className="mb-6 text-muted">Jugadores por rating y clubes por puntos.</p>
      <RankingTabs
        players={<RankingList players={players} />}
        clubs={<ClubRankingList clubs={clubs} />}
      />
    </div>
  );
}
