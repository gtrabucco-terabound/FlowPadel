"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireClubAccess } from "@/lib/admin/club";

type ActionResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

const nameSchema = z.object({ name: z.string().min(1, "Ingresá un nombre").max(80) });

function refresh() {
  revalidatePath("/admin/settings");
}

/* ---- Categories ---- */

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Inválido");
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .insert({ club_id: clubId, name: parsed.data.name.trim() });
  if (error) return fail("No pudimos crear la categoría.");
  refresh();
  return { ok: true };
}

export async function renameCategory(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Inválido");
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name.trim() })
    .eq("id", id)
    .eq("club_id", clubId);
  if (error) return fail("No pudimos actualizar la categoría.");
  refresh();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("club_id", clubId);
  if (error) return fail("No pudimos eliminar la categoría.");
  refresh();
  return { ok: true };
}

/* ---- Courts ---- */

export async function createCourt(formData: FormData): Promise<ActionResult> {
  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Inválido");
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("courts")
    .insert({ club_id: clubId, name: parsed.data.name.trim() });
  if (error) return fail("No pudimos crear la cancha.");
  refresh();
  return { ok: true };
}

export async function renameCourt(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Inválido");
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("courts")
    .update({ name: parsed.data.name.trim() })
    .eq("id", id)
    .eq("club_id", clubId);
  if (error) return fail("No pudimos actualizar la cancha.");
  refresh();
  return { ok: true };
}

export async function toggleCourtActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("courts")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("club_id", clubId);
  if (error) return fail("No pudimos actualizar la cancha.");
  refresh();
  return { ok: true };
}
