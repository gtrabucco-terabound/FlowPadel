import type { createClient } from "@/lib/supabase/server";

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
