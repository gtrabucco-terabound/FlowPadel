import type { createClient } from "@/lib/supabase/server";

/** Cliente Supabase server-side. */
type DB = Awaited<ReturnType<typeof createClient>>;

/**
 * Envuelve Supabase Auth. Es el único módulo que habla con `supabase.auth.*`;
 * el resto del sistema usa `profiles`/`players` para la identidad de dominio.
 */

/** Login con email + contraseña. Devuelve el id del usuario o null. */
export async function signIn(
  supabase: DB,
  email: string,
  password: string
): Promise<{ userId: string } | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) return null;
  return { userId: data.user.id };
}

export type SignUpResult =
  | { ok: false }
  | { ok: true; alreadyRegistered: boolean; hasSession: boolean };

/** Alta de cuenta de jugador. */
export async function signUp(
  supabase: DB,
  input: { email: string; password: string; fullName: string }
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName } },
  });
  if (error) return { ok: false };

  // Anti-enumeración: si el email ya existe, Supabase responde ok pero con
  // identities vacío. Lo detectamos para avisar en vez de mandar a "revisá tu email".
  const alreadyRegistered =
    !!data.user && (data.user.identities?.length ?? 0) === 0;
  return { ok: true, alreadyRegistered, hasSession: !!data.session };
}

/** Cierra la sesión del usuario. */
export async function signOut(supabase: DB): Promise<void> {
  await supabase.auth.signOut();
}
