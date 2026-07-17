import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

/** Cliente Supabase server-side ya autenticado (RLS aplica sobre él). */
type DB = Awaited<ReturnType<typeof createClient>>;

export type NotificationListItem = Pick<
  Database["public"]["Tables"]["notifications"]["Row"],
  "id" | "type" | "title" | "body" | "url" | "read_at" | "created_at"
>;

/**
 * Últimas notificaciones del usuario autenticado.
 * La RLS restringe el resultado a las notificaciones propias.
 */
export async function listRecentNotifications(
  supabase: DB,
  limit = 50
): Promise<NotificationListItem[]> {
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, url, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Marca como leídas todas las notificaciones no leídas del usuario.
 * La RLS restringe el update a las notificaciones propias.
 */
export async function markAllNotificationsReadFor(supabase: DB): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
}

/** Crea una notificación in-app para un jugador. */
export async function insertNotification(
  supabase: DB,
  n: {
    player_id: string;
    type: string;
    title: string;
    body: string | null;
    url: string | null;
  }
): Promise<void> {
  await supabase.from("notifications").insert(n);
}

/**
 * Envía un email transaccional (Edge Function `send-email`).
 * Fire-and-forget: nunca lanza, para no bloquear el flujo que la invoca.
 */
export async function sendTransactionalEmail(
  supabase: DB,
  mail: { to: string; subject: string; heading: string; body: string }
): Promise<void> {
  await supabase.functions.invoke("send-email", { body: mail }).catch(() => {});
}
