"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { insertDemoRequest } from "@/modules/leads/repository";

export type DemoState = { ok: true } | { ok: false; error: string } | null;

const schema = z.object({
  club_name: z.string().trim().min(2, "Ingresá el nombre del club"),
  contact_name: z.string().trim().min(2, "Ingresá tu nombre"),
  email: z
    .union([z.string().trim().email("Email inválido"), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  phone: z
    .string()
    .trim()
    .max(30)
    .transform((v) => (v === "" ? null : v)),
  message: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v === "" ? null : v)),
});

/** Recibe una solicitud de demo desde la landing pública. */
export async function requestDemo(
  _prev: DemoState,
  formData: FormData
): Promise<DemoState> {
  const parsed = schema.safeParse({
    club_name: formData.get("club_name"),
    contact_name: formData.get("contact_name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  // Pedimos al menos un canal de contacto.
  if (!parsed.data.email && !parsed.data.phone) {
    return { ok: false, error: "Dejanos un email o teléfono para contactarte." };
  }

  const supabase = await createClient();
  const { error } = await insertDemoRequest(supabase, {
    clubName: parsed.data.club_name,
    contactName: parsed.data.contact_name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    message: parsed.data.message,
  });
  if (error) {
    return { ok: false, error: "No pudimos enviar tu solicitud. Probá de nuevo." };
  }
  return { ok: true };
}
