import { requireFeature } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { AgendaView, type AgendaCourt, type AgendaBooking, type CoachIntervals } from "@/components/admin/agenda-grid";
import {
  listActiveCourtsForClub,
  listClubBookings,
} from "@/modules/reservations/repository";
import { listClubCoaches, listAvailability } from "@/modules/coaches/repository";

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

  const ctx = await requireFeature("reservations");
  const supabase = await createClient();

  const [courtsData, bookingsData, coaches, availability] = await Promise.all([
    listActiveCourtsForClub(supabase, ctx.activeClubId),
    listClubBookings(supabase, ctx.activeClubId, from, to),
    listClubCoaches(supabase, ctx.activeClubId),
    listAvailability(supabase, ctx.activeClubId),
  ]);

  const courts = courtsData as unknown as AgendaCourt[];
  const bookings = bookingsData as unknown as AgendaBooking[];

  // Disponibilidad de profes ACTIVOS por día de semana → abre turnos de 1h.
  const activeCoachIds = new Set(coaches.filter((c) => c.active).map((c) => c.id));
  const coachIntervals: CoachIntervals = {};
  for (const a of availability) {
    if (!activeCoachIds.has(a.coach_id)) continue;
    (coachIntervals[a.weekday] ??= []).push({
      start: a.start_minutes,
      end: a.end_minutes,
    });
  }

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
        <AgendaView date={day} view={view} courts={courts} bookings={bookings} coachIntervals={coachIntervals} />
      )}
    </div>
  );
}
