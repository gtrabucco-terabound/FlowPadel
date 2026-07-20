"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  requestOperatorAccess,
  decideOperatorRequest as decideOperatorRequestRepo,
} from "@/modules/clubs/repository";

type Result = { ok: true } | { ok: false; error: string };

/** El comercial pide operar un club (queda pendiente de aprobación). */
export async function requestOperateClub(clubId: string): Promise<Result> {
  const supabase = await createClient();
  const res = await requestOperatorAccess(supabase, clubId);
  if (!res.ok)
    return { ok: false, error: res.error ?? "No pudimos enviar la solicitud." };
  revalidatePath("/admin/operar");
  return { ok: true };
}

/** El admin del club aprueba/rechaza una solicitud de operador. */
export async function decideOperatorRequest(
  requestId: string,
  accept: boolean
): Promise<Result> {
  const supabase = await createClient();
  const res = await decideOperatorRequestRepo(supabase, requestId, accept);
  if (!res.ok)
    return { ok: false, error: res.error ?? "No se pudo procesar la solicitud." };
  revalidatePath("/admin/miembros");
  revalidatePath("/admin/operar");
  return { ok: true };
}
