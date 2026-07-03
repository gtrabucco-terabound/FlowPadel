"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
  const { data, error } = await supabase.rpc("admin_create_club", {
    p_name: parsed.data.name,
    p_city: parsed.data.city || undefined,
    p_admin_email: parsed.data.admin_email || undefined,
    p_lead_id: parsed.data.lead_id ?? undefined,
  });

  if (error) {
    return {
      ok: false,
      error: error.message.includes("no autorizado")
        ? "No tenés permiso para crear clubes."
        : "No pudimos crear el club. Probá de nuevo.",
    };
  }

  const adminStatus =
    (data as { admin_status?: string } | null)?.admin_status ?? "sin_admin";

  revalidatePath("/admin/clubes");
  revalidatePath("/admin/prospectos");
  return { ok: true, adminStatus };
}
