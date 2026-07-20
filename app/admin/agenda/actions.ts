"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClubAccess } from "@/lib/admin/club";
import {
  insertBooking,
  getBookingForPayment,
  deleteBooking,
  cancelClubBooking,
  requestBookingPaymentLink,
} from "@/modules/reservations/repository";

type Result = { ok: true } | { ok: false; error: string };
const fail = (e: string): Result => ({ ok: false, error: e });

/** Crea una reserva o bloqueo manual de un turno (desde el panel del club). */
export async function createBooking(formData: FormData): Promise<Result> {
  const courtId = String(formData.get("court_id") ?? "");
  const date = String(formData.get("booking_date") ?? "");
  const startMin = Number(formData.get("start_minutes") ?? -1);
  const slotMin = Number(formData.get("slot_minutes") ?? 90);
  const status = String(formData.get("status") ?? "reserved"); // reserved | blocked
  const name = String(formData.get("customer_name") ?? "").trim();
  const phone = String(formData.get("customer_phone") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();

  if (!courtId || !date || startMin < 0) return fail("Datos de la reserva inválidos.");
  if (status === "reserved" && name.length < 2)
    return fail("Ingresá el nombre de quien reserva.");

  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error, conflict } = await insertBooking(supabase, {
    club_id: clubId,
    court_id: courtId,
    booking_date: date,
    start_minutes: startMin,
    slot_minutes: slotMin,
    status: status === "blocked" ? "blocked" : "reserved",
    kind: "casual",
    customer_name: status === "blocked" ? null : name,
    customer_phone: status === "blocked" ? null : phone || null,
    price: priceRaw ? Number(priceRaw) : null,
    paid_at: null,
  });
  if (error) {
    if (conflict) return fail("Ese turno ya está ocupado.");
    return fail("No pudimos crear la reserva.");
  }
  revalidatePath("/admin/agenda");
  return { ok: true };
}

type PayResult =
  | { ok: true; checkoutUrl: string; bookingId: string }
  | { ok: false; error: string };

/**
 * Crea un turno "en espera de pago" (held, expira en 30 min) y genera el link
 * de pago de Mercado Pago para cobrarle online a quien reserva.
 */
export async function createBookingWithPayment(
  formData: FormData
): Promise<PayResult> {
  const courtId = String(formData.get("court_id") ?? "");
  const date = String(formData.get("booking_date") ?? "");
  const startMin = Number(formData.get("start_minutes") ?? -1);
  const slotMin = Number(formData.get("slot_minutes") ?? 90);
  const name = String(formData.get("customer_name") ?? "").trim();
  const phone = String(formData.get("customer_phone") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const price = priceRaw ? Number(priceRaw) : 0;

  if (!courtId || !date || startMin < 0)
    return { ok: false, error: "Datos de la reserva inválidos." };
  if (name.length < 2)
    return { ok: false, error: "Ingresá el nombre de quien reserva." };
  if (!price || price <= 0)
    return {
      ok: false,
      error: "Configurá un precio por turno en la cancha para cobrar online.",
    };

  const { clubId } = await requireClubAccess();
  const supabase = await createClient();

  const holdExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { id: bookingId, error, conflict } = await insertBooking(supabase, {
    club_id: clubId,
    court_id: courtId,
    booking_date: date,
    start_minutes: startMin,
    slot_minutes: slotMin,
    status: "held",
    kind: "casual",
    customer_name: name,
    customer_phone: phone || null,
    price,
    paid_at: null,
    hold_expires_at: holdExpires,
  });

  if (error || !bookingId) {
    if (conflict) return { ok: false, error: "Ese turno ya está ocupado." };
    return { ok: false, error: "No pudimos reservar el turno." };
  }

  const checkoutUrl = await requestBookingPaymentLink(supabase, bookingId);
  if (!checkoutUrl) {
    // Revertimos el hold para no dejar el turno tomado sin link.
    await deleteBooking(supabase, bookingId);
    return {
      ok: false,
      error:
        "No pudimos generar el link de pago. Verificá que el club tenga Mercado Pago conectado en Ajustes.",
    };
  }

  revalidatePath("/admin/agenda");
  return { ok: true, checkoutUrl, bookingId };
}

/**
 * Genera el link de pago de MP para una reserva YA existente (reservada a mano)
 * sin tener que liberarla ni rehacerla.
 */
export async function generateBookingPaymentLink(
  bookingId: string
): Promise<PayResult> {
  if (!bookingId) return { ok: false, error: "Reserva inválida." };
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();

  const b = await getBookingForPayment(supabase, bookingId, clubId);
  if (!b) return { ok: false, error: "No encontramos la reserva." };
  if (b.paid_at) return { ok: false, error: "Esta reserva ya está pagada." };
  if (!b.price || Number(b.price) <= 0)
    return {
      ok: false,
      error: "La cancha no tiene precio por turno configurado.",
    };

  const checkoutUrl = await requestBookingPaymentLink(supabase, bookingId);
  if (!checkoutUrl) {
    return {
      ok: false,
      error:
        "No pudimos generar el link. Verificá que el club tenga Mercado Pago conectado en Ajustes.",
    };
  }

  revalidatePath("/admin/agenda");
  return { ok: true, checkoutUrl, bookingId };
}

/** Cancela (libera) un turno. */
export async function cancelBooking(id: string): Promise<Result> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await cancelClubBooking(supabase, id, clubId);
  if (error) return fail("No pudimos cancelar el turno.");
  revalidatePath("/admin/agenda");
  return { ok: true };
}
