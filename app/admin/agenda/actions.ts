"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClubAccess } from "@/lib/admin/club";

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
  const { error } = await supabase.from("court_bookings").insert({
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
    if (error.code === "23505") return fail("Ese turno ya está ocupado.");
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
  const { data: inserted, error } = await supabase
    .from("court_bookings")
    .insert({
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
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ese turno ya está ocupado." };
    return { ok: false, error: "No pudimos reservar el turno." };
  }

  const bookingId = inserted.id as string;
  const { data: pref, error: fnError } = await supabase.functions.invoke(
    "mp-booking-preference",
    { body: { booking_id: bookingId } }
  );

  if (fnError || !pref?.checkout_url) {
    // Revertimos el hold para no dejar el turno tomado sin link.
    await supabase.from("court_bookings").delete().eq("id", bookingId);
    return {
      ok: false,
      error:
        "No pudimos generar el link de pago. Verificá que el club tenga Mercado Pago conectado en Ajustes.",
    };
  }

  revalidatePath("/admin/agenda");
  return { ok: true, checkoutUrl: pref.checkout_url as string, bookingId };
}

/** Cancela (libera) un turno. */
export async function cancelBooking(id: string): Promise<Result> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("court_bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("club_id", clubId);
  if (error) return fail("No pudimos cancelar el turno.");
  revalidatePath("/admin/agenda");
  return { ok: true };
}
