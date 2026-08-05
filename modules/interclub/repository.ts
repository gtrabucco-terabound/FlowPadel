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

export async function listLigas(supabase: DB): Promise<InterclubLiga[]> {
  // RLS: devuelve las ligas que organiza o en las que participa el usuario.
  const { data } = await supabase
    .from("interclub_ligas")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as InterclubLiga[];
}

/** Liga visible para el usuario (organizador o participante), vía RLS. */
export async function getLigaAny(supabase: DB, ligaId: string): Promise<InterclubLiga | null> {
  const { data } = await supabase
    .from("interclub_ligas")
    .select("*")
    .eq("id", ligaId)
    .maybeSingle();
  return (data as InterclubLiga) ?? null;
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
  name: string,
  organizerName: string
): Promise<{ id: string | null; error: string | null }> {
  // El código lo genera un trigger de la base (único). No lo pasamos.
  const { data, error } = await supabase
    .from("interclub_ligas")
    .insert({ club_id: clubId, name })
    .select("id")
    .single();
  if (error || !data) return { id: null, error: error?.message ?? "insert failed" };
  // El organizador también participa: se crea su equipo automáticamente.
  await supabase.from("interclub_teams").insert({
    liga_id: data.id,
    name: organizerName,
    club_id: clubId,
  });
  return { id: data.id, error: null };
}

/* ---- RPCs (cada club opera su parte de una liga compartida) ---- */

export async function joinInterclubRpc(
  supabase: DB,
  code: string,
  clubId: string
): Promise<{ ok: boolean; liga?: string; error?: string }> {
  const { data } = await supabase.rpc("join_interclub", { p_code: code, p_club_id: clubId });
  return (data as { ok: boolean; liga?: string; error?: string }) ?? { ok: false, error: "Error" };
}

export async function saveInterclubPairRpc(
  supabase: DB,
  ligaId: string,
  clubId: string,
  category: string,
  pair: string
): Promise<{ ok: boolean; error?: string }> {
  const { data } = await supabase.rpc("save_interclub_pair", {
    p_liga: ligaId, p_club_id: clubId, p_category: category, p_pair: pair,
  });
  return (data as { ok: boolean; error?: string }) ?? { ok: false, error: "Error" };
}

export async function confirmInterclubTeamRpc(
  supabase: DB,
  ligaId: string,
  clubId: string,
  confirmed: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { data } = await supabase.rpc("confirm_interclub_team", {
    p_liga: ligaId, p_club_id: clubId, p_confirmed: confirmed,
  });
  return (data as { ok: boolean; error?: string }) ?? { ok: false, error: "Error" };
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

/* ---- B2: categorías, parejas por categoría, líneas de serie ---- */

export type InterclubPair = Tables<"interclub_pairs">;
export type SeriesLine = Tables<"interclub_series_lines">;

export async function setLigaCategories(
  supabase: DB,
  ligaId: string,
  clubId: string,
  categories: string[]
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("interclub_ligas")
    .update({ categories })
    .eq("id", ligaId)
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}

/** Parejas por categoría de todos los equipos de la liga. */
export async function listPairs(supabase: DB, ligaId: string): Promise<InterclubPair[]> {
  const teams = await listTeams(supabase, ligaId);
  const ids = teams.map((t) => t.id);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("interclub_pairs")
    .select("*")
    .in("team_id", ids);
  return (data ?? []) as InterclubPair[];
}

export async function upsertPair(
  supabase: DB,
  teamId: string,
  category: string,
  pairName: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("interclub_pairs")
    .upsert({ team_id: teamId, category, pair_name: pairName }, { onConflict: "team_id,category" });
  return { error: Boolean(error) };
}

/** Líneas (resultados por categoría) de todas las series de la liga. */
export async function listAllLines(supabase: DB, ligaId: string): Promise<SeriesLine[]> {
  const { data: series } = await supabase
    .from("interclub_series")
    .select("id")
    .eq("liga_id", ligaId);
  const ids = (series ?? []).map((s) => s.id);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("interclub_series_lines")
    .select("*")
    .in("series_id", ids);
  return (data ?? []) as SeriesLine[];
}

export async function upsertSeriesLine(
  supabase: DB,
  seriesId: string,
  category: string,
  home: number,
  away: number
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("interclub_series_lines")
    .upsert(
      { series_id: seriesId, category, home_score: home, away_score: away },
      { onConflict: "series_id,category" }
    );
  return { error: Boolean(error) };
}

export async function listSeriesLines(supabase: DB, seriesId: string): Promise<SeriesLine[]> {
  const { data } = await supabase
    .from("interclub_series_lines")
    .select("*")
    .eq("series_id", seriesId);
  return (data ?? []) as SeriesLine[];
}

/** Actualiza el marcador agregado de la serie (categorías ganadas) + estado. */
export async function setSeriesAggregate(
  supabase: DB,
  seriesId: string,
  homeCats: number,
  awayCats: number,
  completed: boolean
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("interclub_series")
    .update({
      home_cats_won: homeCats,
      away_cats_won: awayCats,
      status: completed ? "completed" : "scheduled",
    })
    .eq("id", seriesId);
  return { error: Boolean(error) };
}

/** Jugadores del club (para elegir parejas). Nombre + categoría. */
export async function listClubPlayerNames(
  supabase: DB,
  clubId: string
): Promise<{ full_name: string; category: string | null }[]> {
  const { data } = await supabase
    .from("players")
    .select("full_name, category")
    .eq("home_club_id", clubId)
    .order("full_name", { ascending: true });
  return (data ?? []).map((p) => ({
    full_name: p.full_name,
    category: p.category == null ? null : String(p.category),
  }));
}
