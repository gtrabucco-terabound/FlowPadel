import type { createClient } from "@/lib/supabase/server";

/** Cliente Supabase server-side. */
type DB = Awaited<ReturnType<typeof createClient>>;

export type DemoRequestInput = {
  clubName: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  message: string | null;
};

/**
 * Guarda una solicitud de demo de la landing (inicio del funnel de clubes).
 * La RLS permite INSERT anónimo; solo el superadmin puede leerlas.
 */
export async function insertDemoRequest(
  supabase: DB,
  input: DemoRequestInput
): Promise<{ error: boolean }> {
  const { error } = await supabase.from("demo_requests").insert({
    club_name: input.clubName,
    contact_name: input.contactName,
    email: input.email,
    phone: input.phone,
    message: input.message,
    source: "landing",
  });
  return { error: Boolean(error) };
}
