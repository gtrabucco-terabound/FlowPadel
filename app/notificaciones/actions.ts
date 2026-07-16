"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsReadFor } from "@/modules/notifications/repository";

/** Marca todas las notificaciones del jugador como leídas. RLS restringe a las propias. */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await markAllNotificationsReadFor(supabase);

  revalidatePath("/notificaciones");
  revalidatePath("/", "layout");
}
