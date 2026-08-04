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
  setSeriesResult,
  getLiga,
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

/** Genera el fixture de liga (todos contra todos → series). No duplica. */
export async function generateInterclubFixture(ligaId: string): Promise<Result> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();

  const liga = await getLiga(supabase, ligaId, clubId);
  if (!liga) return fail("Liga no encontrada.");

  const existing = await countSeries(supabase, ligaId);
  if (existing > 0)
    return fail("El fixture ya está generado. Borralo si querés regenerarlo.");

  const teams = await listTeams(supabase, ligaId);
  if (teams.length < 2) return fail("Cargá al menos 2 equipos.");

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

export async function recordInterclubSeries(
  ligaId: string,
  seriesId: string,
  formData: FormData
): Promise<Result> {
  const home = Number(formData.get("home_cats_won"));
  const away = Number(formData.get("away_cats_won"));
  if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0)
    return fail("Cargá cuántas categorías ganó cada equipo.");
  await requireClubAccess();
  const supabase = await createClient();
  const { error } = await setSeriesResult(supabase, seriesId, home, away);
  if (error) return fail("No pudimos guardar el resultado.");
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
