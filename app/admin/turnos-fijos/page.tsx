import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import {
  FixedBookingsManager,
  type FixedCourt,
  type FixedBookingRow,
  type FixedChargeRow,
  type ClientSuggestion,
} from "@/components/admin/fixed-bookings-manager";

export const dynamic = "force-dynamic";

function currentPeriod(): string {
  const now = new Date(Date.now() - 3 * 3600 * 1000);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function TurnosFijosPage() {
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const [{ data: courtsData }, { data: fbData }, { data: chargesData }] =
    await Promise.all([
      supabase
        .from("courts")
        .select("id, name, number, open_hour, close_hour, slot_minutes, price_per_slot")
        .eq("club_id", ctx.activeClubId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("fixed_bookings")
        .select(
          "id, court_id, weekday, start_minutes, slot_minutes, customer_name, customer_phone, monthly_price, active, created_at"
        )
        .eq("club_id", ctx.activeClubId)
        .eq("active", true)
        .order("weekday"),
      supabase
        .from("fixed_booking_charges")
        .select("id, fixed_booking_id, period, amount, status, due_date, checkout_url")
        .eq("club_id", ctx.activeClubId)
        .eq("period", currentPeriod()),
    ]);

  // Buscador de cliente: jugadores del club + clientes previos de reservas.
  const [{ data: clubPlayers }, { data: pastCustomers }] = await Promise.all([
    supabase
      .from("players")
      .select("id, full_name, phone")
      .eq("home_club_id", ctx.activeClubId)
      .limit(500),
    supabase
      .from("court_bookings")
      .select("customer_name, customer_phone")
      .eq("club_id", ctx.activeClubId)
      .not("customer_name", "is", null)
      .limit(500),
  ]);

  const clientMap = new Map<string, ClientSuggestion>();
  for (const p of clubPlayers ?? []) {
    if (!p.full_name) continue;
    const key = (p.phone || p.full_name).toLowerCase();
    clientMap.set(key, { name: p.full_name, phone: p.phone, player_id: p.id });
  }
  for (const c of pastCustomers ?? []) {
    if (!c.customer_name) continue;
    const key = (c.customer_phone || c.customer_name).toLowerCase();
    if (!clientMap.has(key))
      clientMap.set(key, { name: c.customer_name, phone: c.customer_phone, player_id: null });
  }
  const clients = Array.from(clientMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Turnos fijos</h1>
        <p className="mt-1 text-sm text-muted">
          Clientes con turno recurrente todas las semanas. Se bloquea la agenda
          del mes y se cobra por adelantado con un link mensual.
        </p>
      </div>
      <FixedBookingsManager
        courts={(courtsData ?? []) as FixedCourt[]}
        fixedBookings={(fbData ?? []) as FixedBookingRow[]}
        charges={(chargesData ?? []) as FixedChargeRow[]}
        clients={clients}
        period={currentPeriod()}
      />
    </div>
  );
}
