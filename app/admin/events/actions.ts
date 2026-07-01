"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireClubAccess, slugify } from "@/lib/admin/club";

const createEventSchema = z.object({
  name: z.string().min(2, "Ingresá un nombre").max(120),
  event_type: z.enum(["tournament", "open_play"]),
  start_date: z.string().optional().or(z.literal("")),
  modality: z
    .enum(["caballeros", "damas", "mixto", "combinado"])
    .nullable(),
  category_system: z.enum(["fixed", "suma"]).nullable(),
  category_value: z.string().max(40).nullable(),
  // Interclub: si se tilda, exige un club rival (id no vacío; la FK valida que exista).
  is_interclub: z.boolean(),
  rival_club_id: z.string().min(1).nullable(),
});

export type CreateEventResult = { ok: false; error: string } | { ok: true; id: string };

/** Create a draft event for the active club with an auto-generated unique slug. */
export async function createEvent(formData: FormData): Promise<CreateEventResult> {
  const rawModality = formData.get("modality");
  const rawCatSystem = formData.get("category_system");
  const rawCatValue = formData.get("category_value");
  const rawRival = formData.get("rival_club_id");
  const isInterclub = formData.get("is_interclub") === "on";
  const parsed = createEventSchema.safeParse({
    name: formData.get("name"),
    event_type: formData.get("event_type"),
    start_date: formData.get("start_date"),
    modality: rawModality ? String(rawModality) : null,
    category_system: rawCatSystem ? String(rawCatSystem) : null,
    category_value:
      rawCatValue && String(rawCatValue).trim()
        ? String(rawCatValue).trim()
        : null,
    is_interclub: isInterclub,
    rival_club_id: isInterclub && rawRival ? String(rawRival) : null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  if (parsed.data.is_interclub && !parsed.data.rival_club_id) {
    return { ok: false, error: "Elegí el club rival del interclub." };
  }

  const { clubId } = await requireClubAccess();
  const supabase = await createClient();

  const base = slugify(parsed.data.name) || "evento";
  let slug = base;
  // Ensure global slug uniqueness (slug is used in public routes).
  for (let i = 0; i < 50; i++) {
    const { data: clash } = await supabase
      .from("events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!clash) break;
    slug = `${base}-${i + 2}`;
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      club_id: clubId,
      name: parsed.data.name.trim(),
      slug,
      event_type: parsed.data.event_type,
      status: "draft",
      start_date: parsed.data.start_date ? parsed.data.start_date : null,
      modality: parsed.data.modality,
      category_system: parsed.data.category_system,
      category_value: parsed.data.category_value,
      is_interclub: parsed.data.is_interclub,
      rival_club_id: parsed.data.rival_club_id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "No pudimos crear el evento." };
  }

  revalidatePath("/admin/events");
  revalidatePath("/admin");
  redirect(`/admin/events/${data.id}`);
}

/**
 * Aceptar un desafío interclub: el admin del CLUB RIVAL acepta el evento vía el
 * RPC accept_interclub (SECURITY DEFINER, autoriza por admin del club rival).
 */
export async function acceptInterclubChallenge(
  eventId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_interclub", {
    p_event_id: eventId,
  });
  if (error) return { ok: false, error: error.message || "No pudimos aceptar el desafío." };
  revalidatePath("/admin/events");
  return { ok: true };
}
