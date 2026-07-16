"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createPublicHold,
  requestBookingPaymentLink,
} from "@/modules/reservations/repository";

type Result =
  | { ok: true; mode: "pay"; checkoutUrl: string }
  | { ok: true; mode: "confirmed" }
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

  const res = await createPublicHold(supabase, input);
  if (!res?.ok || !res.id) {
    return { ok: false, error: res?.error ?? "No pudimos reservar el turno." };
  }

  // Club que cobra en el club: la reserva ya quedó confirmada, sin Mercado Pago.
  if (res.pay_at_club) {
    return { ok: true, mode: "confirmed" };
  }

  const checkoutUrl = await requestBookingPaymentLink(supabase, res.id);
  if (!checkoutUrl) {
    // El hold expira solo en 30 min (cron), no queda el turno tomado indefinido.
    return { ok: false, error: "No pudimos generar el pago. Probá de nuevo." };
  }

  return { ok: true, mode: "pay", checkoutUrl };
}
