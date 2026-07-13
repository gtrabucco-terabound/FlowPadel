"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/** El comercial pide operar un club (queda pendiente de aprobación). */
export async function requestOperateClub(clubId: string): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("operator_request_club", {
    p_club_id: clubId,
  });
  const res = data as { ok: boolean; error?: string } | null;
  if (error || !res?.ok)
    return { ok: false, error: res?.error ?? "No pudimos enviar la solicitud." };
  revalidatePath("/admin/operar");
  return { ok: true };
}

/** El admin del club aprueba/rechaza una solicitud de operador. */
export async function decideOperatorRequest(
  requestId: string,
  accept: boolean
): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("operator_decide", {
    p_request_id: requestId,
    p_accept: accept,
  });
  const res = data as { ok: boolean; error?: string } | null;
  if (error || !res?.ok)
    return { ok: false, error: res?.error ?? "No se pudo procesar la solicitud." };
  revalidatePath("/admin/miembros");
  revalidatePath("/admin/operar");
  return { ok: true };
}
