"use server";

import { createClient } from "@/lib/supabase/server";

type Result =
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string };

/**
 * Reserva pública iniciada por el jugador: crea un hold de 30 min (vía RPC
 * segura) y devuelve el link de pago de Mercado Pago. Sin login.
 */
export async function createPublicBooking(input: {
  slug: string;
  courtId: string;
  date: string;
  startMinutes: number;
  name: string;
  phone: string;
}): Promise<Result> {
  const supabase = await createClient();

  const { data: hold, error } = await supabase.rpc("create_public_hold", {
    p_slug: input.slug,
    p_court_id: input.courtId,
    p_date: input.date,
    p_start: input.startMinutes,
    p_name: input.name,
    p_phone: input.phone,
  });

  const res = hold as { ok: boolean; id?: string; error?: string } | null;
  if (error || !res?.ok || !res.id) {
    return { ok: false, error: res?.error ?? "No pudimos reservar el turno." };
  }

  const { data: pref, error: fnError } = await supabase.functions.invoke(
    "mp-booking-preference",
    { body: { booking_id: res.id } }
  );
  if (fnError || !pref?.checkout_url) {
    // El hold expira solo en 30 min (cron), no queda el turno tomado indefinido.
    return { ok: false, error: "No pudimos generar el pago. Probá de nuevo." };
  }

  return { ok: true, checkoutUrl: pref.checkout_url as string };
}
