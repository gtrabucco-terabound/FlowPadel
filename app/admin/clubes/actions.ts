"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin/club";
import {
  adminCreateClub,
  setClubActiveFlag,
  adminDeleteClub,
  setClubPlanId,
} from "@/modules/clubs/repository";

type Result =
  | { ok: true; adminStatus: string }
  | { ok: false; error: string };

const schema = z.object({
  name: z.string().trim().min(2, "El nombre del club es obligatorio"),
  city: z.string().trim().optional().default(""),
  admin_email: z
    .union([z.string().trim().email("Email inválido"), z.literal("")])
    .optional()
    .default(""),
  lead_id: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

/** Crea un club (solo superadmin, validado en la RPC). Opcional: admin + lead del CRM. */
export async function createClub(
  _prev: Result | null,
  formData: FormData
): Promise<Result | null> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    city: formData.get("city") ?? "",
    admin_email: formData.get("admin_email") ?? "",
    lead_id: formData.get("lead_id") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const res = await adminCreateClub(supabase, {
    name: parsed.data.name,
    city: parsed.data.city,
    adminEmail: parsed.data.admin_email,
    leadId: parsed.data.lead_id ?? undefined,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: res.unauthorized
        ? "No tenés permiso para crear clubes."
        : "No pudimos crear el club. Probá de nuevo.",
    };
  }

  revalidatePath("/admin/clubes");
  revalidatePath("/admin/prospectos");
  return { ok: true, adminStatus: res.adminStatus };
}

/* ---- Gestión de clubes (superadmin): activar / eliminar ---- */

type SimpleResult = { ok: true } | { ok: false; error: string };

/** Activa o desactiva (archiva) un club. Solo superadmin (RLS). */
export async function setClubActive(
  clubId: string,
  active: boolean
): Promise<SimpleResult> {
  const supabase = await createClient();
  const { error } = await setClubActiveFlag(supabase, clubId, active);
  if (error) return { ok: false, error: "No pudimos actualizar el club." };
  revalidatePath("/admin/clubes");
  return { ok: true };
}

/** Asigna el plan de un club (o lo quita con planId vacío). Solo superadmin. */
export async function setClubPlan(
  clubId: string,
  planId: string | null
): Promise<SimpleResult> {
  const ctx = await getAdminContext();
  if (!ctx.superadmin)
    return { ok: false, error: "Solo un superadmin puede asignar planes." };
  const supabase = await createClient();
  const { error } = await setClubPlanId(supabase, clubId, planId || null);
  if (error) return { ok: false, error: "No pudimos asignar el plan." };
  revalidatePath("/admin/clubes");
  return { ok: true };
}

/** Elimina un club (cascada de config). Bloquea si tiene eventos o reservas. */
export async function deleteClub(clubId: string): Promise<SimpleResult> {
  const supabase = await createClient();
  const outcome = await adminDeleteClub(supabase, clubId);
  if (outcome === "error")
    return { ok: false, error: "No pudimos eliminar el club." };
  if (outcome === "forbidden")
    return { ok: false, error: "Solo un superadmin puede eliminar clubes." };
  if (outcome === "has_data")
    return {
      ok: false,
      error:
        "Este club tiene eventos o reservas. Desactivalo en lugar de eliminarlo (así no perdés el historial).",
    };
  revalidatePath("/admin/clubes");
  return { ok: true };
}
