import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

type DB = Awaited<ReturnType<typeof createClient>>;

export type InterclubLiga = Tables<"interclub_ligas">;
export type InterclubTeam = Tables<"interclub_teams">;
export type InterclubSeries = Tables<"interclub_series">;

export type SeriesView = InterclubSeries & {
  home: { name: string } | null;
  away: { name: string } | null;
};

/* ---- Ligas ---- */

export async function listLigas(supabase: DB, clubId: string): Promise<InterclubLiga[]> {
  const { data } = await supabase
    .from("interclub_ligas")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });
  return (data ?? []) as InterclubLiga[];
}

export async function getLiga(
  supabase: DB,
  ligaId: string,
  clubId: string
): Promise<InterclubLiga | null> {
  const { data } = await supabase
    .from("interclub_ligas")
    .select("*")
    .eq("id", ligaId)
    .eq("club_id", clubId)
    .maybeSingle();
  return (data as InterclubLiga) ?? null;
}

export async function createLiga(
  supabase: DB,
  clubId: string,
  name: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("interclub_ligas")
    .insert({ club_id: clubId, name })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

export async function setLigaStatus(
  supabase: DB,
  ligaId: string,
  clubId: string,
  status: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("interclub_ligas")
    .update({ status })
    .eq("id", ligaId)
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}

export async function deleteLiga(
  supabase: DB,
  ligaId: string,
  clubId: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("interclub_ligas")
    .delete()
    .eq("id", ligaId)
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}

/* ---- Equipos ---- */

export async function listTeams(supabase: DB, ligaId: string): Promise<InterclubTeam[]> {
  const { data } = await supabase
    .from("interclub_teams")
    .select("*")
    .eq("liga_id", ligaId)
    .order("name", { ascending: true });
  return (data ?? []) as InterclubTeam[];
}

export async function insertTeam(
  supabase: DB,
  ligaId: string,
  name: string
): Promise<{ error: boolean }> {
  const { error } = await supabase.from("interclub_teams").insert({ liga_id: ligaId, name });
  return { error: Boolean(error) };
}

export async function deleteTeam(supabase: DB, id: string): Promise<{ error: boolean }> {
  const { error } = await supabase.from("interclub_teams").delete().eq("id", id);
  return { error: Boolean(error) };
}

/* ---- Series (fixture) ---- */

export async function listSeries(supabase: DB, ligaId: string): Promise<SeriesView[]> {
  const { data } = await supabase
    .from("interclub_series")
    .select("*, home:interclub_teams!interclub_series_home_team_id_fkey(name), away:interclub_teams!interclub_series_away_team_id_fkey(name)")
    .eq("liga_id", ligaId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as SeriesView[];
}

export async function countSeries(supabase: DB, ligaId: string): Promise<number> {
  const { count } = await supabase
    .from("interclub_series")
    .select("id", { count: "exact", head: true })
    .eq("liga_id", ligaId);
  return count ?? 0;
}

export async function insertSeriesBatch(
  supabase: DB,
  rows: { liga_id: string; home_team_id: string; away_team_id: string }[]
): Promise<{ error: boolean }> {
  if (rows.length === 0) return { error: false };
  const { error } = await supabase.from("interclub_series").insert(rows);
  return { error: Boolean(error) };
}

export async function setSeriesResult(
  supabase: DB,
  id: string,
  homeCats: number,
  awayCats: number
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("interclub_series")
    .update({ home_cats_won: homeCats, away_cats_won: awayCats, status: "completed" })
    .eq("id", id);
  return { error: Boolean(error) };
}
