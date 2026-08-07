import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

type DB = Awaited<ReturnType<typeof createClient>>;

export type ClubWhatsappInstance = Tables<"club_whatsapp_instances">;

/** Instancia de WhatsApp del club (o null si todavía no se creó). */
export async function getClubInstance(
  supabase: DB,
  clubId: string
): Promise<ClubWhatsappInstance | null> {
  const { data } = await supabase
    .from("club_whatsapp_instances")
    .select("*")
    .eq("club_id", clubId)
    .maybeSingle();
  return (data as ClubWhatsappInstance | null) ?? null;
}

/** Crea (o deja) la fila de la instancia con un nombre estable. */
export async function upsertClubInstance(
  supabase: DB,
  clubId: string,
  instanceName: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("club_whatsapp_instances")
    .upsert(
      { club_id: clubId, instance_name: instanceName, updated_at: new Date().toISOString() },
      { onConflict: "club_id" }
    );
  return { error: Boolean(error) };
}

/** Actualiza el estado/teléfono tras consultar Evolution. */
export async function setInstanceStatus(
  supabase: DB,
  clubId: string,
  status: string,
  phone: string | null
): Promise<{ error: boolean }> {
  const patch: {
    status: string;
    updated_at: string;
    phone?: string;
    last_connected_at?: string;
  } = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (phone) patch.phone = phone;
  if (status === "connected") patch.last_connected_at = new Date().toISOString();
  const { error } = await supabase
    .from("club_whatsapp_instances")
    .update(patch)
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}
