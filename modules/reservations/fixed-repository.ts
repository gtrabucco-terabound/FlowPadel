import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

/** Cliente Supabase server-side (RLS aplica sobre él). */
type DB = Awaited<ReturnType<typeof createClient>>;

export type FixedCourtRow = Pick<
  Tables<"courts">,
  "id" | "name" | "number" | "open_hour" | "close_hour" | "slot_minutes" | "price_per_slot"
>;
export type FixedBookingRowData = Pick<
  Tables<"fixed_bookings">,
  | "id"
  | "court_id"
  | "weekday"
  | "start_minutes"
  | "slot_minutes"
  | "customer_name"
  | "customer_phone"
  | "monthly_price"
  | "active"
  | "created_at"
>;
export type FixedChargeRowData = Pick<
  Tables<"fixed_booking_charges">,
  "id" | "fixed_booking_id" | "period" | "amount" | "status" | "due_date" | "checkout_url"
>;
export type ClientSuggestionData = {
  name: string;
  phone: string | null;
  email: string | null;
  player_id: string | null;
};

/** Canchas activas del club (para elegir el turno fijo). */
export async function listFixedCourts(
  supabase: DB,
  clubId: string
): Promise<FixedCourtRow[]> {
  const { data } = await supabase
    .from("courts")
    .select("id, name, number, open_hour, close_hour, slot_minutes, price_per_slot")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("name");
  return (data ?? []) as FixedCourtRow[];
}

/** Turnos fijos activos del club. */
export async function listFixedBookings(
  supabase: DB,
  clubId: string
): Promise<FixedBookingRowData[]> {
  const { data } = await supabase
    .from("fixed_bookings")
    .select(
      "id, court_id, weekday, start_minutes, slot_minutes, customer_name, customer_phone, monthly_price, active, created_at"
    )
    .eq("club_id", clubId)
    .eq("active", true)
    .order("weekday");
  return (data ?? []) as FixedBookingRowData[];
}

/** Cobros de los turnos fijos para un periodo (YYYY-MM). */
export async function listFixedChargesForPeriod(
  supabase: DB,
  clubId: string,
  period: string
): Promise<FixedChargeRowData[]> {
  const { data } = await supabase
    .from("fixed_booking_charges")
    .select("id, fixed_booking_id, period, amount, status, due_date, checkout_url")
    .eq("club_id", clubId)
    .eq("period", period);
  return (data ?? []) as FixedChargeRowData[];
}

/**
 * Sugerencias de cliente para el buscador: jugadores del club + clientes
 * previos de reservas, deduplicados por teléfono (o nombre) y ordenados.
 */
export async function listClientSuggestions(
  supabase: DB,
  clubId: string
): Promise<ClientSuggestionData[]> {
  const [{ data: clubPlayers }, { data: pastCustomers }] = await Promise.all([
    supabase
      .from("players")
      .select("id, full_name, phone, email")
      .eq("home_club_id", clubId)
      .limit(500),
    supabase
      .from("court_bookings")
      .select("customer_name, customer_phone, customer_email")
      .eq("club_id", clubId)
      .not("customer_name", "is", null)
      .limit(500),
  ]);

  const byKey = new Map<string, ClientSuggestionData>();
  for (const p of clubPlayers ?? []) {
    if (!p.full_name) continue;
    const key = (p.phone || p.full_name).toLowerCase();
    byKey.set(key, {
      name: p.full_name,
      phone: p.phone,
      email: (p.email as string | null) ?? null,
      player_id: p.id,
    });
  }
  for (const c of pastCustomers ?? []) {
    if (!c.customer_name) continue;
    const key = (c.customer_phone || c.customer_name).toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, {
        name: c.customer_name,
        phone: c.customer_phone,
        email: c.customer_email ?? null,
        player_id: null,
      });
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Dedupe global de jugador por teléfono (RPC). */
export async function findPlayerByPhone(
  supabase: DB,
  phone: string
): Promise<{ id: string; email: string | null } | null> {
  const { data } = await supabase.rpc("find_player_by_phone", { p_phone: phone });
  const found = Array.isArray(data) ? data[0] : data;
  if (!found?.id) return null;
  return { id: found.id as string, email: (found.email as string) || null };
}

export type NewFixedBooking = {
  club_id: string;
  court_id: string;
  weekday: number;
  start_minutes: number;
  slot_minutes: number;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  player_id: string | null;
  monthly_price: number;
};

/** Crea el turno fijo. Devuelve su id. */
export async function insertFixedBooking(
  supabase: DB,
  row: NewFixedBooking
): Promise<string | null> {
  const { data, error } = await supabase
    .from("fixed_bookings")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

/** Nombres de club y cancha (para armar los avisos). */
export async function getClubAndCourtNames(
  supabase: DB,
  clubId: string,
  courtId: string
): Promise<{ clubName: string; courtName: string }> {
  const [{ data: club }, { data: court }] = await Promise.all([
    supabase.from("clubs").select("name").eq("id", clubId).maybeSingle(),
    supabase.from("courts").select("name").eq("id", courtId).maybeSingle(),
  ]);
  return {
    clubName: club?.name ?? "el club",
    courtName: court?.name ?? "la cancha",
  };
}

export type FixedChargeResult = {
  ok?: boolean;
  checkout_url?: string;
  already_paid?: boolean;
  error?: string;
} | null;

/** Genera/obtiene el cobro mensual del turno fijo (Edge Function). */
export async function requestFixedCharge(
  supabase: DB,
  fixedBookingId: string,
  period?: string
): Promise<{ res: FixedChargeResult; error: boolean }> {
  const { data, error } = await supabase.functions.invoke("mp-fixed-charge", {
    body: { fixed_booking_id: fixedBookingId, period },
  });
  return { res: (data as FixedChargeResult) ?? null, error: Boolean(error) };
}

/** Da de baja el turno fijo. */
export async function deactivateFixed(
  supabase: DB,
  id: string,
  clubId: string
): Promise<void> {
  await supabase
    .from("fixed_bookings")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("club_id", clubId);
}

/** Libera las ocurrencias futuras del turno fijo (las pasadas quedan). */
export async function cancelFutureOccurrences(
  supabase: DB,
  fixedBookingId: string,
  fromDate: string
): Promise<void> {
  await supabase
    .from("court_bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("fixed_booking_id", fixedBookingId)
    .gte("booking_date", fromDate);
}
