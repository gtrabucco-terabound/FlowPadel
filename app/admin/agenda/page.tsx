import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { AgendaView, type AgendaCourt, type AgendaBooking } from "@/components/admin/agenda-grid";

export const dynamic = "force-dynamic";

type View = "dia" | "semana" | "mes";
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function todayISO(): string {
  return iso(new Date());
}
function rangeFor(view: View, dateISO: string): [string, string] {
  const d = new Date(dateISO + "T12:00:00");
  if (view === "semana") {
    const js = d.getDay(); // 0=Dom
    const monOffset = js === 0 ? -6 : 1 - js;
    const mon = new Date(d);
    mon.setDate(d.getDate() + monOffset);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return [iso(mon), iso(sun)];
  }
  if (view === "mes") {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return [iso(first), iso(last)];
  }
  return [dateISO, dateISO];
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const { date, view: viewRaw } = await searchParams;
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayISO();
  const view: View =
    viewRaw === "semana" || viewRaw === "mes" ? viewRaw : "dia";
  const [from, to] = rangeFor(view, day);

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
      .select("id, court_id, booking_date, start_minutes, slot_minutes, status, kind, customer_name, customer_phone, checkout_url, amount_charged, paid_at")
      .eq("club_id", ctx.activeClubId)
      .gte("booking_date", from)
      .lte("booking_date", to)
      .neq("status", "cancelled"),
  ]);

  const courts = (courtsData ?? []) as AgendaCourt[];
  const bookings = (bookingsData ?? []) as AgendaBooking[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Agenda de canchas</h1>
        <p className="mt-1 text-sm text-muted">
          Reservá o bloqueá turnos y mirá la disponibilidad de la semana o el mes
          de un vistazo.
        </p>
      </div>
      {courts.length === 0 ? (
        <div className="rounded-xl border border-border-soft bg-surface px-4 py-10 text-center text-sm text-muted">
          No hay canchas activas. Cargalas en Ajustes → Canchas (con horarios y
          precio por turno) para ver la agenda.
        </div>
      ) : (
        <AgendaView date={day} view={view} courts={courts} bookings={bookings} />
      )}
    </div>
  );
}
