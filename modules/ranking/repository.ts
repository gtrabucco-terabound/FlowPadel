import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

/** Cliente Supabase server-side (RLS aplica sobre él). */
type DB = Awaited<ReturnType<typeof createClient>>;

/** Jugador con nombre de club, para home y flyer del ranking. */
export type TopPlayerWithClub = {
  id: string;
  full_name: string;
  elo_rating: number;
  club: { name: string | null } | null;
};

/** Jugador con stats, para la lista de ranking. */
export type TopRatedPlayer = Pick<
  Tables<"players">,
  "id" | "full_name" | "elo_rating" | "matches_played" | "matches_won"
>;

/** Fila de ranking de clubes ya enriquecida con la ciudad. */
export type ClubRankingEntry = {
  club_id: string;
  club_name: string;
  city: string | null;
  total_points: number;
  players_count: number;
  tournaments_count: number;
};

/** Top de jugadores por rating con su club (solo quienes ya jugaron). */
export async function listTopPlayersWithClub(
  supabase: DB,
  limit: number
): Promise<TopPlayerWithClub[]> {
  const { data } = await supabase
    .from("players")
    .select("id, full_name, elo_rating, club:clubs(name)")
    .gt("matches_played", 0)
    .order("elo_rating", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as TopPlayerWithClub[];
}

/** Top de jugadores por rating con stats (solo quienes ya jugaron). */
export async function listTopRatedPlayers(
  supabase: DB,
  limit: number
): Promise<TopRatedPlayer[]> {
  const { data } = await supabase
    .from("players")
    .select("id, full_name, elo_rating, matches_played, matches_won")
    .gt("matches_played", 0)
    .order("elo_rating", { ascending: false })
    .limit(limit);
  return (data ?? []) as TopRatedPlayer[];
}

/** Ranking de clubes (RPC) enriquecido con la ciudad de cada club. */
export async function listClubRanking(supabase: DB): Promise<ClubRankingEntry[]> {
  const [{ data: ranking }, { data: clubs }] = await Promise.all([
    supabase.rpc("club_ranking"),
    supabase.from("clubs").select("id, city"),
  ]);
  const cityById = new Map<string, string | null>(
    (clubs ?? []).map((c) => [c.id, c.city])
  );
  return (ranking ?? []).map((c) => ({
    club_id: c.club_id,
    club_name: c.club_name,
    city: cityById.get(c.club_id) ?? null,
    total_points: c.total_points,
    players_count: c.players_count,
    tournaments_count: c.tournaments_count,
  }));
}
