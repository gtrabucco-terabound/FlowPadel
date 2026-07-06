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

const numOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Guarda la configuración completa de una cancha. */
export async function updateCourtConfig(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1) return fail("Ingresá un nombre de cancha.");

  const enclosure = String(formData.get("enclosure_type") ?? "");
  const surface = String(formData.get("surface") ?? "");
  const openHour = numOrNull(formData.get("open_hour"));
  const closeHour = numOrNull(formData.get("close_hour"));
  const days = formData
    .getAll("days")
    .map((d) => Number(d))
    .filter((n) => n >= 1 && n <= 7);

  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("courts")
    .update({
      name,
      number: numOrNull(formData.get("number")),
      enclosure_type: enclosure === "" ? null : (enclosure as "blindex" | "muro" | "mixta"),
      surface: surface === "" ? null : (surface as "cesped_sintetico" | "cemento" | "otro"),
      covered: formData.get("covered") === "on",
      lighting: formData.get("lighting") === "on",
      panoramic: formData.get("panoramic") === "on",
      rental_price_hour: numOrNull(formData.get("rental_price_hour")),
      operating_days: days.length > 0 ? days : [1, 2, 3, 4, 5, 6, 7],
      open_hour: openHour ?? 8,
      close_hour: closeHour ?? 24,
    })
    .eq("id", id)
    .eq("club_id", clubId);
  if (error) return fail("No pudimos guardar la cancha.");
  refresh();
  return { ok: true };
}
