"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Enums, TablesUpdate } from "@/lib/database.types";

export type ProfileState = { error: string } | { ok: true } | null;

const genderValues = ["male", "female"] as const;

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Ingresá tu nombre"),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine(
      (v) => v === "" || v.replace(/\D/g, "").length >= 8,
      "Ingresá un celular válido (solo números)"
    )
    .transform((v) => (v === "" ? null : v)),
  first_name: optionalText,
  birthdate: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  gender: z
    .union([z.enum(genderValues), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  category: z
    .union([
      z.coerce.number().int().min(1, "Categoría inválida").max(9, "Categoría inválida"),
      z.literal(""),
    ])
    .transform((v) => (v === "" ? null : v)),
  hand: z
    .union([z.enum(["drive", "reves"]), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  home_club_id: optionalText,
  club_other: optionalText, // club que no está registrado (CRM lead)
  photo_url: optionalText,
  notify_enabled: z.boolean(),
  notify_mixto: z.boolean(),
  notify_inapp: z.boolean(),
  notify_email: z.boolean(),
  notify_telegram: z.boolean(),
  notify_whatsapp: z.boolean(),
});

/**
 * Updates the authenticated user's own player row (Pantalla 2 del perfil).
 * RLS additionally guarantees a player can only update its own row.
 * Si el jugador escribe un club que no está en la lista, se registra como
 * "lead" (CRM encubierto) vía upsert_club_lead y se enlaza en club_lead_id.
 */
export async function updateMyPlayerProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada. Volvé a ingresar." };

  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone") ?? "",
    first_name: formData.get("first_name") ?? "",
    birthdate: formData.get("birthdate") ?? "",
    gender: formData.get("gender") ?? "",
    category: formData.get("category") ?? "",
    hand: formData.get("hand") ?? "",
    home_club_id: formData.get("home_club_id") ?? "",
    club_other: formData.get("club_other") ?? "",
    photo_url: formData.get("photo_url") ?? "",
    notify_enabled: formData.get("notify_enabled") === "on",
    notify_mixto: formData.get("notify_mixto") === "on",
    notify_inapp: formData.get("notify_inapp") === "on",
    notify_email: formData.get("notify_email") === "on",
    notify_telegram: formData.get("notify_telegram") === "on",
    notify_whatsapp: formData.get("notify_whatsapp") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!player) return { error: "No encontramos tu ficha de jugador." };

  // Resolver el club: si eligió uno registrado, ese manda y se limpia el lead.
  // Si no y escribió un nombre libre, se registra como lead (CRM).
  let clubLeadId: string | null = null;
  if (!parsed.data.home_club_id && parsed.data.club_other) {
    const { data: leadId } = await supabase.rpc("upsert_club_lead", {
      p_name: parsed.data.club_other,
    });
    clubLeadId = (leadId as string | null) ?? null;
  }

  const update: TablesUpdate<"players"> = {
    full_name: parsed.data.full_name,
    phone: parsed.data.phone,
    first_name: parsed.data.first_name,
    birthdate: parsed.data.birthdate,
    gender: parsed.data.gender as Enums<"gender"> | null,
    category: parsed.data.category,
    hand: parsed.data.hand,
    home_club_id: parsed.data.home_club_id,
    club_lead_id: parsed.data.home_club_id ? null : clubLeadId,
    photo_url: parsed.data.photo_url,
    notify_enabled: parsed.data.notify_enabled,
    notify_mixto: parsed.data.notify_mixto,
    notify_inapp: parsed.data.notify_inapp,
    notify_email: parsed.data.notify_email,
    notify_telegram: parsed.data.notify_telegram,
    notify_whatsapp: parsed.data.notify_whatsapp,
  };

  const { error } = await supabase
    .from("players")
    .update(update)
    .eq("id", player.id)
    .eq("profile_id", user.id);

  if (error) {
    return { error: "No pudimos guardar los cambios. Probá de nuevo." };
  }

  revalidatePath("/perfil");
  return { ok: true };
}
