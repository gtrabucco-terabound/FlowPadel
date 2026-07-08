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
