import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { AgendaGrid, type AgendaCourt, type AgendaBooking } from "@/components/admin/agenda-grid";

export const dynamic = "force-dynamic";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayISO();
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const [{ data: courtsData }, { data: bookingsData }] = await Promise.all([
    supabase
      .from("courts")
      .select(
        "id, name, number, is_active, open_hour, close_hour, slot_minutes, operating_days, price_per_slot"
      )
      .eq("club_id", ctx.activeClubId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("court_bookings")
      .select("id, court_id, start_minutes, slot_minutes, status, kind, customer_name")
      .eq("club_id", ctx.activeClubId)
      .eq("booking_date", day)
      .neq("status", "cancelled"),
  ]);

  const courts = (courtsData ?? []) as AgendaCourt[];
  const bookings = (bookingsData ?? []) as AgendaBooking[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Agenda de canchas</h1>
        <p className="mt-1 text-sm text-muted">
          Reservá o bloqueá turnos. Tocá un turno libre para reservarlo; los
          ocupados los podés liberar.
        </p>
      </div>
      {courts.length === 0 ? (
        <div className="rounded-xl border border-border-soft bg-surface px-4 py-10 text-center text-sm text-muted">
          No hay canchas activas. Cargalas en Ajustes → Canchas (con horarios y
          precio por turno) para ver la agenda.
        </div>
      ) : (
        <AgendaGrid date={day} courts={courts} bookings={bookings} />
      )}
    </div>
  );
}
