"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const signupSchema = credentialsSchema.extend({
  full_name: z.string().min(2, "Ingresá tu nombre"),
});

export type AuthState = { error: string } | null;

/** Login for both players and admins. Redirects by role. */
export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { error: "Email o contraseña incorrectos." };
  }

  // Determine destination by role: club_member -> /admin, else -> /
  const { data: membership } = await supabase
    .from("club_members")
    .select("id")
    .eq("profile_id", data.user.id)
    .limit(1)
    .maybeSingle();

  redirect(membership ? "/admin" : "/");
}

/** Sign up a new player account. */
export async function signupAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
    },
  });

  if (error) {
    return { error: "No pudimos crear la cuenta. Probá con otro email." };
  }

  // Con verificación por email activada, signUp no crea sesión: el usuario
  // debe confirmar por mail primero. Sin sesión → pantalla "revisá tu email".
  if (!data.session) {
    redirect("/verifica-email");
  }

  // Sin verificación (sesión inmediata) → Pantalla 2 del perfil.
  redirect("/perfil?welcome=1");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
