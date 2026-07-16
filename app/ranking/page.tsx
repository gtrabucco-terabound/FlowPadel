import { createClient } from "@/lib/supabase/server";
import { RankingList, type RankingPlayer } from "@/components/ranking-list";
import {
  ClubRankingList,
  type ClubRankingRow,
} from "@/components/club-ranking-list";
import { RankingTabs } from "@/components/ranking-tabs";
import {
  listTopRatedPlayers,
  listClubRanking,
} from "@/modules/ranking/repository";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const supabase = await createClient();

  const [playersData, clubRanking] = await Promise.all([
    listTopRatedPlayers(supabase, 50),
    listClubRanking(supabase),
  ]);

  const players = playersData as RankingPlayer[];

  const clubs: ClubRankingRow[] = clubRanking.filter(
    (c) => Number(c.total_points) > 0 // solo clubes con actividad
  );

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
