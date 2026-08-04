"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClubAccess } from "@/lib/admin/club";
import {
  createLiga,
  setLigaStatus,
  deleteLiga,
  listTeams,
  insertTeam,
  deleteTeam,
  countSeries,
  insertSeriesBatch,
  getLiga,
  setLigaCategories,
  listPairs,
  upsertPair,
  upsertSeriesLine,
  listSeriesLines,
  setSeriesAggregate,
} from "@/modules/interclub/repository";

type Result = { ok: true; id?: string } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

function refresh(ligaId?: string) {
  revalidatePath("/admin/interclub");
  if (ligaId) revalidatePath(`/admin/interclub/${ligaId}`);
}

export async function createInterclubLiga(formData: FormData): Promise<Result> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return fail("Ingresá un nombre para la liga.");
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const id = await createLiga(supabase, clubId, name);
  if (!id) return fail("No pudimos crear la liga.");
  refresh();
  return { ok: true, id };
}

export async function addInterclubTeam(ligaId: string, formData: FormData): Promise<Result> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return fail("Ingresá el nombre del equipo/club.");
  await requireClubAccess();
  const supabase = await createClient();
  const { error } = await insertTeam(supabase, ligaId, name);
  if (error) return fail("No pudimos agregar el equipo.");
  refresh(ligaId);
  return { ok: true };
}

export async function removeInterclubTeam(ligaId: string, id: string): Promise<Result> {
  await requireClubAccess();
  const supabase = await createClient();
  const { error } = await deleteTeam(supabase, id);
  if (error) return fail("No pudimos quitar el equipo.");
  refresh(ligaId);
  return { ok: true };
}

/** Define las categorías en juego de la liga (ej. 5ta, 6ta, 7ta, 8va). */
export async function saveInterclubCategories(
  ligaId: string,
  formData: FormData
): Promise<Result> {
  const cats = [
    ...new Set(formData.getAll("category").map((c) => String(c).trim()).filter(Boolean)),
  ];
  if (cats.length === 0) return fail("Elegí al menos una categoría.");
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await setLigaCategories(supabase, ligaId, clubId, cats);
  if (error) return fail("No pudimos guardar las categorías.");
  refresh(ligaId);
  return { ok: true };
}

/** Carga/edita la pareja de un club en una categoría. */
export async function saveInterclubPair(
  ligaId: string,
  teamId: string,
  category: string,
  formData: FormData
): Promise<Result> {
  const j1 = String(formData.get("jugador_1") ?? "").trim();
  const j2 = String(formData.get("jugador_2") ?? "").trim();
  const name = [j1, j2].filter(Boolean).join(" / ");
  if (name.length < 2) return fail("Cargá la pareja (al menos un jugador).");
  await requireClubAccess();
  const supabase = await createClient();
  const { error } = await upsertPair(supabase, teamId, category, name);
  if (error) return fail("No pudimos guardar la pareja.");
  refresh(ligaId);
  return { ok: true };
}

/** Genera el fixture (todos contra todos) validando que esté todo cargado. */
export async function generateInterclubFixture(ligaId: string): Promise<Result> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();

  const liga = await getLiga(supabase, ligaId, clubId);
  if (!liga) return fail("Liga no encontrada.");

  const existing = await countSeries(supabase, ligaId);
  if (existing > 0)
    return fail("El fixture ya está generado. Borralo si querés regenerarlo.");

  const cats = liga.categories ?? [];
  if (cats.length === 0) return fail("Primero definí las categorías en juego.");

  const teams = await listTeams(supabase, ligaId);
  if (teams.length < 2) return fail("Cargá al menos 2 clubes.");

  // Candado: cada club debe tener su pareja cargada en cada categoría.
  const pairs = await listPairs(supabase, ligaId);
  const have = new Set(pairs.map((p) => `${p.team_id}|${p.category}`));
  const faltantes: string[] = [];
  for (const t of teams)
    for (const c of cats)
      if (!have.has(`${t.id}|${c}`)) faltantes.push(`${t.name} (${c})`);
  if (faltantes.length > 0)
    return fail(`Faltan parejas: ${faltantes.slice(0, 4).join(", ")}${faltantes.length > 4 ? "…" : ""}`);

  const rows: { liga_id: string; home_team_id: string; away_team_id: string }[] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      rows.push({ liga_id: ligaId, home_team_id: teams[i].id, away_team_id: teams[j].id });
    }
  }
  const { error } = await insertSeriesBatch(supabase, rows);
  if (error) return fail("No pudimos generar el fixture.");
  await setLigaStatus(supabase, ligaId, clubId, "in_progress");
  refresh(ligaId);
  return { ok: true };
}

/** Carga el resultado de una categoría dentro de una serie y recalcula el marcador. */
export async function saveInterclubLine(
  ligaId: string,
  seriesId: string,
  category: string,
  categoriesTotal: number,
  formData: FormData
): Promise<Result> {
  const home = Number(formData.get("home_score"));
  const away = Number(formData.get("away_score"));
  if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0)
    return fail("Cargá el resultado de la categoría.");
  if (home === away) return fail("No puede haber empate en la categoría.");
  await requireClubAccess();
  const supabase = await createClient();
  const { error } = await upsertSeriesLine(supabase, seriesId, category, home, away);
  if (error) return fail("No pudimos guardar el resultado.");

  // Recalcula categorías ganadas por cada lado; completa la serie si están todas.
  const lines = await listSeriesLines(supabase, seriesId);
  let hc = 0;
  let ac = 0;
  for (const l of lines) {
    if (l.home_score == null || l.away_score == null) continue;
    if (l.home_score > l.away_score) hc++;
    else if (l.away_score > l.home_score) ac++;
  }
  await setSeriesAggregate(supabase, seriesId, hc, ac, lines.length >= categoriesTotal);
  refresh(ligaId);
  return { ok: true };
}

export async function removeInterclubLiga(ligaId: string): Promise<Result> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await deleteLiga(supabase, ligaId, clubId);
  if (error) return fail("No pudimos borrar la liga.");
  refresh();
  return { ok: true };
}
