import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

/** Cliente Supabase server-side (RLS aplica sobre él). */
type DB = Awaited<ReturnType<typeof createClient>>;

export type PublicClub = { name: string; slug: string; city: string | null };

export type PublicCourtData = {
  id: string;
  name: string;
  number: number | null;
  open_hour: number;
  close_hour: number;
  slot_minutes: number;
  price_per_slot: number | null;
  operating_days: number[] | null;
  bands?: {
    start_minutes: number;
    end_minutes: number;
    slot_minutes: number;
    price: number | null;
  }[] | null;
};
export type PublicBookingRowData = {
  court_id: string;
  start_minutes: number;
  slot_minutes: number;
  status: string;
};
export type PublicOfferData = {
  court_id: string;
  start_minutes: number;
  discount_pct: number;
};
export type PublicCourtDay = {
  club: { name: string; city: string | null; pay_at_club: boolean } | null;
  courts: PublicCourtData[];
  bookings: PublicBookingRowData[];
  offers?: PublicOfferData[] | null;
};

/** Clubes con reserva pública online disponible. */
export async function listPublicBookingClubs(
  supabase: DB
): Promise<PublicClub[]> {
  const { data } = await supabase.rpc("public_booking_clubs");
  return (data ?? []) as unknown as PublicClub[];
}

/** Canchas + reservas del día de un club (sin datos personales). */
export async function getPublicCourtDay(
  supabase: DB,
  slug: string,
  date: string
): Promise<PublicCourtDay | null> {
  const { data } = await supabase.rpc("public_court_day", {
    p_slug: slug,
    p_date: date,
  });
  return (data ?? null) as unknown as PublicCourtDay | null;
}

export type PublicHoldResult = {
  ok: boolean;
  id?: string;
  error?: string;
  pay_at_club?: boolean;
};

/** Crea un hold de 30 min iniciado por el jugador (RPC segura). */
export async function createPublicHold(
  supabase: DB,
  input: {
    slug: string;
    courtId: string;
    date: string;
    startMinutes: number;
    name: string;
    phone: string;
  }
): Promise<PublicHoldResult | null> {
  const { data, error } = await supabase.rpc("create_public_hold", {
    p_slug: input.slug,
    p_court_id: input.courtId,
    p_date: input.date,
    p_start: input.startMinutes,
    p_name: input.name,
    p_phone: input.phone,
  });
  if (error) return null;
  return data as unknown as PublicHoldResult | null;
}

/** Genera el link de pago de Mercado Pago para una reserva (Edge Function). */
export async function requestBookingPaymentLink(
  supabase: DB,
  bookingId: string
): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke(
    "mp-booking-preference",
    { body: { booking_id: bookingId } }
  );
  if (error || !data?.checkout_url) return null;
  return data.checkout_url as string;
}

/* ---- Agenda del club (panel admin) ---- */

export type CourtSlotBand = {
  start_minutes: number;
  end_minutes: number;
  slot_minutes: number;
  price: number | null;
};
export type AgendaCourtRow = Pick<
  Tables<"courts">,
  | "id"
  | "name"
  | "number"
  | "is_active"
  | "open_hour"
  | "close_hour"
  | "slot_minutes"
  | "operating_days"
  | "price_per_slot"
> & { bands: CourtSlotBand[] };
export type AgendaBookingRow = Pick<
  Tables<"court_bookings">,
  | "id"
  | "court_id"
  | "booking_date"
  | "start_minutes"
  | "slot_minutes"
  | "status"
  | "kind"
  | "customer_name"
  | "customer_phone"
  | "checkout_url"
  | "amount_charged"
  | "paid_at"
>;

/** Canchas activas del club para la agenda. */
export async function listActiveCourtsForClub(
  supabase: DB,
  clubId: string
): Promise<AgendaCourtRow[]> {
  const { data } = await supabase
    .from("courts")
    .select(
      "id, name, number, is_active, open_hour, close_hour, slot_minutes, operating_days, price_per_slot, bands:court_slot_bands(start_minutes, end_minutes, slot_minutes, price)"
    )
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("name");
  return (data ?? []).map((c) => ({ ...c, bands: c.bands ?? [] })) as AgendaCourtRow[];
}

/* ---- Franjas de turno (court_slot_bands) ---- */

export async function listCourtBands(
  supabase: DB,
  clubId: string
): Promise<(CourtSlotBand & { id: string; court_id: string })[]> {
  const { data } = await supabase
    .from("court_slot_bands")
    .select("id, court_id, start_minutes, end_minutes, slot_minutes, price, courts!inner(club_id)")
    .eq("courts.club_id", clubId)
    .order("start_minutes");
  return (data ?? []).map((b) => ({
    id: b.id,
    court_id: b.court_id,
    start_minutes: b.start_minutes,
    end_minutes: b.end_minutes,
    slot_minutes: b.slot_minutes,
    price: b.price,
  }));
}

export async function insertCourtBand(
  supabase: DB,
  input: { court_id: string; start_minutes: number; end_minutes: number; slot_minutes: number; price: number | null }
): Promise<{ error: boolean }> {
  const { error } = await supabase.from("court_slot_bands").insert(input);
  return { error: Boolean(error) };
}

export async function deleteCourtBand(
  supabase: DB,
  id: string
): Promise<{ error: boolean }> {
  const { error } = await supabase.from("court_slot_bands").delete().eq("id", id);
  return { error: Boolean(error) };
}

/** Duración de turno base + franjas de una cancha (para agendar clases/grupos). */
export async function getCourtSlotBasis(
  supabase: DB,
  courtId: string
): Promise<{ slot_minutes: number; bands: CourtSlotBand[] } | null> {
  const { data } = await supabase
    .from("courts")
    .select("slot_minutes, bands:court_slot_bands(start_minutes, end_minutes, slot_minutes, price)")
    .eq("id", courtId)
    .maybeSingle();
  if (!data) return null;
  return { slot_minutes: data.slot_minutes, bands: (data.bands ?? []) as CourtSlotBand[] };
}

/** Franjas de una cancha (para validar solapes al agregar). */
export async function listBandsForCourt(
  supabase: DB,
  courtId: string
): Promise<CourtSlotBand[]> {
  const { data } = await supabase
    .from("court_slot_bands")
    .select("start_minutes, end_minutes, slot_minutes, price")
    .eq("court_id", courtId)
    .order("start_minutes");
  return (data ?? []) as CourtSlotBand[];
}

/** Reservas del club en un rango de fechas (excluye canceladas). */
export async function listClubBookings(
  supabase: DB,
  clubId: string,
  from: string,
  to: string
): Promise<AgendaBookingRow[]> {
  const { data } = await supabase
    .from("court_bookings")
    .select(
      "id, court_id, booking_date, start_minutes, slot_minutes, status, kind, customer_name, customer_phone, checkout_url, amount_charged, paid_at"
    )
    .eq("club_id", clubId)
    .gte("booking_date", from)
    .lte("booking_date", to)
    .neq("status", "cancelled");
  return (data ?? []) as AgendaBookingRow[];
}

export type NewBooking = {
  club_id: string;
  court_id: string;
  booking_date: string;
  start_minutes: number;
  slot_minutes: number;
  status: string;
  kind: string;
  customer_name: string | null;
  customer_phone: string | null;
  price: number | null;
  paid_at: string | null;
  hold_expires_at?: string | null;
};

/** Inserta una reserva/bloqueo manual. `conflict` = turno ya ocupado (23505). */
export async function insertBooking(
  supabase: DB,
  row: NewBooking
): Promise<{ error: boolean; conflict: boolean; id: string | null }> {
  const { data, error } = await supabase
    .from("court_bookings")
    .insert(row)
    .select("id")
    .single();
  return {
    error: Boolean(error),
    conflict: error?.code === "23505",
    id: data?.id ?? null,
  };
}

/** Datos mínimos de una reserva para cobrarla (verifica pertenencia al club). */
export async function getBookingForPayment(
  supabase: DB,
  bookingId: string,
  clubId: string
): Promise<Pick<
  Tables<"court_bookings">,
  "id" | "status" | "price" | "paid_at"
> | null> {
  const { data } = await supabase
    .from("court_bookings")
    .select("id, status, price, paid_at")
    .eq("id", bookingId)
    .eq("club_id", clubId)
    .maybeSingle();
  return data ?? null;
}

/** Borra una reserva (revertir un hold sin link de pago). */
export async function deleteBooking(
  supabase: DB,
  bookingId: string
): Promise<void> {
  await supabase.from("court_bookings").delete().eq("id", bookingId);
}

export type DayBooking = {
  id: string;
  court_id: string;
  court_name: string;
  court_number: number | null;
  start_minutes: number;
  slot_minutes: number;
  status: string;
  kind: string;
  customer_name: string | null;
};

/** Reservas del club para un día, con el nombre de la cancha (agenda de hoy). */
export async function listDayBookingsWithCourt(
  supabase: DB,
  clubId: string,
  date: string
): Promise<DayBooking[]> {
  const { data } = await supabase
    .from("court_bookings")
    .select(
      "id, court_id, start_minutes, slot_minutes, status, kind, customer_name, court:courts(name, number)"
    )
    .eq("club_id", clubId)
    .eq("booking_date", date)
    .neq("status", "cancelled")
    .order("start_minutes", { ascending: true });
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    court_id: string;
    start_minutes: number;
    slot_minutes: number;
    status: string;
    kind: string;
    customer_name: string | null;
    court: { name: string | null; number: number | null } | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    court_id: r.court_id,
    court_name: r.court?.name ?? "Cancha",
    court_number: r.court?.number ?? null,
    start_minutes: r.start_minutes,
    slot_minutes: r.slot_minutes,
    status: r.status,
    kind: r.kind,
    customer_name: r.customer_name,
  }));
}

/** Cancela (libera) un turno del club. */
export async function cancelClubBooking(
  supabase: DB,
  bookingId: string,
  clubId: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("court_bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}
