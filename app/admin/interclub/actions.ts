"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClubAccess } from "@/lib/admin/club";
import {
  createLiga,
  setLigaStatus,
  deleteLiga,
  listTeams,
  deleteTeam,
  countSeries,
  insertSeriesBatch,
  getLiga,
  setLigaCategories,
  listPairs,
  upsertSeriesLine,
  listSeriesLines,
  setSeriesAggregate,
  joinInterclubRpc,
  saveInterclubPairRpc,
  confirmInterclubTeamRpc,
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
  const { data: club } = await supabase.from("clubs").select("name").eq("id", clubId).maybeSingle();
  const { id, error } = await createLiga(supabase, clubId, name, club?.name ?? "Mi club");
  if (!id) return fail(error ? `No pudimos crear la liga: ${error}` : "No pudimos crear la liga.");
  refresh();
  return { ok: true, id };
}

/** Un club se suma a una liga con el código compartido. */
export async function joinInterclubLiga(formData: FormData): Promise<Result> {
  const code = String(formData.get("code") ?? "").trim();
  if (code.length < 4) return fail("Ingresá el código.");
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const r = await joinInterclubRpc(supabase, code, clubId);
  if (!r.ok) return fail(r.error ?? "No pudimos sumarte.");
  refresh();
  return { ok: true, id: r.liga };
}

/** Confirma (o desconfirma) el equipo del club en la liga. */
export async function confirmInterclubTeam(ligaId: string, confirmed: boolean): Promise<Result> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const r = await confirmInterclubTeamRpc(supabase, ligaId, clubId, confirmed);
  if (!r.ok) return fail(r.error ?? "No pudimos confirmar.");
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
  // Cantidad de parejas por categoría (por defecto 1, tope 6).
  const pairsPerCat: Record<string, number> = {};
  for (const c of cats) {
    const n = Number(formData.get(`count_${c}`));
    pairsPerCat[c] = Number.isFinite(n) && n >= 1 && n <= 6 ? Math.floor(n) : 1;
  }
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await setLigaCategories(supabase, ligaId, clubId, cats, pairsPerCat);
  if (error) return fail("No pudimos guardar las categorías.");
  refresh(ligaId);
  return { ok: true };
}

/** Carga/edita la pareja del club (el propio) en una categoría, vía RPC segura. */
export async function saveInterclubPair(
  ligaId: string,
  category: string,
  slot: number,
  formData: FormData
): Promise<Result> {
  const j1 = String(formData.get("jugador_1") ?? "").trim();
  const j2 = String(formData.get("jugador_2") ?? "").trim();
  const name = [j1, j2].filter(Boolean).join(" / ");
  if (name.length < 2) return fail("Cargá la pareja (al menos un jugador).");
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const r = await saveInterclubPairRpc(supabase, ligaId, clubId, category, slot, name);
  if (!r.ok) return fail(r.error ?? "No pudimos guardar la pareja.");
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
  const counts = (liga.pairs_per_cat ?? {}) as Record<string, number>;
  const countFor = (c: string) => Math.max(1, Number(counts[c]) || 1);

  const teams = await listTeams(supabase, ligaId);
  if (teams.length < 2) return fail("Se tienen que sumar al menos 2 clubes.");

  // Candado: todos los clubes tienen que haber confirmado su equipo.
  const sinConfirmar = teams.filter((t) => !t.confirmed).map((t) => t.name);
  if (sinConfirmar.length > 0)
    return fail(`Falta que confirmen: ${sinConfirmar.slice(0, 4).join(", ")}${sinConfirmar.length > 4 ? "…" : ""}`);

  // Candado: cada club debe tener su pareja cargada en cada categoría y slot.
  const pairs = await listPairs(supabase, ligaId);
  const have = new Set(pairs.map((p) => `${p.team_id}|${p.category}|${p.slot}`));
  const faltantes: string[] = [];
  for (const t of teams)
    for (const c of cats)
      for (let sl = 1; sl <= countFor(c); sl++)
        if (!have.has(`${t.id}|${c}|${sl}`))
          faltantes.push(`${t.name} (${c}${countFor(c) > 1 ? ` #${sl}` : ""})`);
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
  slot: number,
  linesTotal: number,
  formData: FormData
): Promise<Result> {
  const home = Number(formData.get("home_score"));
  const away = Number(formData.get("away_score"));
  if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0)
    return fail("Cargá el resultado.");
  if (home === away) return fail("No puede haber empate.");
  await requireClubAccess();
  const supabase = await createClient();
  const { error } = await upsertSeriesLine(supabase, seriesId, category, slot, home, away);
  if (error) return fail("No pudimos guardar el resultado.");

  // Recalcula líneas ganadas por cada lado; completa la serie si están todas.
  const lines = await listSeriesLines(supabase, seriesId);
  let hc = 0;
  let ac = 0;
  for (const l of lines) {
    if (l.home_score == null || l.away_score == null) continue;
    if (l.home_score > l.away_score) hc++;
    else if (l.away_score > l.home_score) ac++;
  }
  await setSeriesAggregate(supabase, seriesId, hc, ac, lines.length >= linesTotal);
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
