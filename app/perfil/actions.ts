"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Enums, TablesUpdate } from "@/lib/database.types";

export type ProfileState = { error: string } | { ok: true } | null;

const genderValues = ["male", "female"] as const;

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Ingresá tu nombre"),
  gender: z
    .union([z.enum(genderValues), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  category: z
    .union([
      z.coerce.number().int().min(1, "Categoría inválida").max(9, "Categoría inválida"),
      z.literal(""),
    ])
    .transform((v) => (v === "" ? null : v)),
  home_club_id: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
});

/**
 * Updates the authenticated user's own player row. RLS additionally guarantees
 * a player can only update its own row (profile_id = auth.uid()).
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
    gender: formData.get("gender") ?? "",
    category: formData.get("category") ?? "",
    home_club_id: formData.get("home_club_id") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // Verify the player belongs to this user.
  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!player) {
    return { error: "No encontramos tu ficha de jugador." };
  }

  const update: TablesUpdate<"players"> = {
    full_name: parsed.data.full_name,
    gender: parsed.data.gender as Enums<"gender"> | null,
    category: parsed.data.category,
    home_club_id: parsed.data.home_club_id,
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
