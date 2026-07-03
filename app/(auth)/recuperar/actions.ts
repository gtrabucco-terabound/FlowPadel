"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type RecoverState = { error: string } | { ok: true } | null;

const schema = z.object({ email: z.string().email("Email inválido") });

/** Envía el mail de recupero de contraseña. Siempre responde ok (anti-enumeración). */
export async function requestPasswordReset(
  _prev: RecoverState,
  formData: FormData
): Promise<RecoverState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email inválido" };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email);

  return { ok: true };
}
