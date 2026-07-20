"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireClubAccess } from "@/lib/admin/club";
import {
  addClubMember,
  updateMemberRole,
  removeClubMember,
} from "@/modules/clubs/repository";
import type { Enums } from "@/lib/database.types";

export type AddMemberResult =
  | { ok: true }
  | { ok: false; error: string; code?: "not_found" };

type ActionResult = { ok: true } | { ok: false; error: string };

const roleSchema = z.enum(["club_admin", "staff"]);

const addSchema = z.object({
  email: z.string().min(1).email(),
  role: roleSchema,
});

/** Solo un club_admin (o superadmin vía RLS) puede gestionar miembros. */
async function requireAdmin(): Promise<
  | { ok: true; clubId: string; userId: string }
  | { ok: false; error: string }
> {
  const { clubId, role, userId } = await requireClubAccess();
  if (role !== "club_admin") {
    return {
      ok: false,
      error: "Solo el administrador del club puede gestionar miembros.",
    };
  }
  return { ok: true, clubId, userId };
}

export async function addMember(formData: FormData): Promise<AddMemberResult> {
  const parsed = addSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const outcome = await addClubMember(
    supabase,
    guard.clubId,
    parsed.data.email.trim(),
    parsed.data.role as Enums<"club_member_role">
  );

  if (outcome === "error")
    return { ok: false, error: "No pudimos agregar al miembro." };
  if (outcome === "not_found") {
    return {
      ok: false,
      code: "not_found",
      error:
        "No existe una cuenta con ese email. Pedile que cree su cuenta primero.",
    };
  }

  revalidatePath("/admin/miembros");
  return { ok: true };
}

export async function changeRole(
  profileId: string,
  role: Enums<"club_member_role">
): Promise<ActionResult> {
  const parsedRole = roleSchema.safeParse(role);
  const parsedId = z.string().min(1).safeParse(profileId);
  if (!parsedRole.success || !parsedId.success)
    return { ok: false, error: "Datos inválidos." };

  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  // No permitir auto-degradarse.
  if (profileId === guard.userId && parsedRole.data !== "club_admin")
    return { ok: false, error: "No podés cambiar tu propio rol." };

  const supabase = await createClient();
  const { error } = await updateMemberRole(
    supabase,
    guard.clubId,
    profileId,
    parsedRole.data
  );

  if (error) return { ok: false, error: "No pudimos cambiar el rol." };

  revalidatePath("/admin/miembros");
  return { ok: true };
}

export async function removeMember(profileId: string): Promise<ActionResult> {
  const parsedId = z.string().min(1).safeParse(profileId);
  if (!parsedId.success) return { ok: false, error: "Datos inválidos." };

  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  // No permitir quitarse a sí mismo.
  if (profileId === guard.userId)
    return { ok: false, error: "No podés quitarte a vos mismo." };

  const supabase = await createClient();
  const { error } = await removeClubMember(supabase, guard.clubId, profileId);

  if (error) return { ok: false, error: "No pudimos quitar al miembro." };

  revalidatePath("/admin/miembros");
  return { ok: true };
}
