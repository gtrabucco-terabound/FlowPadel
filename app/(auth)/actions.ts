"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { signIn, signUp, signOut } from "@/modules/identity/repository";
import { isClubMember } from "@/modules/clubs/repository";

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
  const session = await signIn(supabase, parsed.data.email, parsed.data.password);

  if (!session) {
    return { error: "Email o contraseña incorrectos." };
  }

  // Determine destination by role: club_member -> /admin, else -> /
  const member = await isClubMember(supabase, session.userId);
  redirect(member ? "/admin" : "/");
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
  const res = await signUp(supabase, {
    email: parsed.data.email,
    password: parsed.data.password,
    fullName: parsed.data.full_name,
  });

  if (!res.ok) {
    return { error: "No pudimos crear la cuenta. Probá con otro email." };
  }

  // Email ya registrado (Supabase, por anti-enumeración, responde ok pero con
  // identities vacío): avisamos en vez de mandar a "revisá tu email".
  if (res.alreadyRegistered) {
    return {
      error:
        "Ese email ya tiene una cuenta. Ingresá con tu contraseña o usá “¿Olvidaste tu contraseña?”.",
    };
  }

  // Con verificación por email activada, signUp no crea sesión: el usuario
  // debe confirmar por mail primero. Sin sesión → pantalla "revisá tu email".
  if (!res.hasSession) {
    redirect("/verifica-email");
  }

  // Sin verificación (sesión inmediata) → Pantalla 2 del perfil.
  redirect("/perfil?welcome=1");
}

export async function logoutAction() {
  const supabase = await createClient();
  await signOut(supabase);
  redirect("/");
}
