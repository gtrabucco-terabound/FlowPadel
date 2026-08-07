import Link from "next/link";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { getClubDashboard } from "@/modules/tournaments/repository";
import { countClubCourts, getClubInfo } from "@/modules/clubs/repository";
import { getClubPaymentSettings } from "@/modules/payments/repository";
import {
  getClubKpis,
  getCourtOccupancy,
  listTopPlayers,
  listUpcomingEvents,
} from "@/modules/dashboard/repository";
import { getCoachesReport, type CoachReport } from "@/modules/coaches/repository";
import {
  OnboardingChecklist,
  type OnboardingStep,
} from "@/components/admin/onboarding-checklist";

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");
/** Rango del mes actual y hoy (horario AR, UTC-3) en YYYY-MM-DD. */
function monthRange(): { from: string; to: string; today: string } {
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const from = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
  const today = `${y}-${pad(m + 1)}-${pad(d.getUTCDate())}`;
  return { from, to, today };
}

const TIPO: Record<string, string> = {
  tournament: "Torneo",
  open_play: "Cancha abierta",
};

function fmtDia(iso: string | null): string {
  if (!iso) return "Sin fecha";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
}

export default async function AdminDashboard() {
  const ctx = await getAdminContext();
  const clubId = ctx.activeClubId;
  const supabase = await createClient();
  const { from, to, today } = monthRange();
  const showCoaches = ctx.features.lessons;

  const [
    { events: rows, pendingCount },
    courtsCount,
    club,
    pay,
    kpis,
    occ,
    topPlayers,
    upcoming,
    coaches,
  ] = await Promise.all([
    getClubDashboard(supabase, clubId),
    countClubCourts(supabase, clubId),
    getClubInfo(supabase, clubId),
    getClubPaymentSettings(supabase, clubId),
    getClubKpis(supabase, clubId, from, to),
    getCourtOccupancy(supabase, clubId, from, today),
    listTopPlayers(supabase, clubId, 3),
    listUpcomingEvents(supabase, clubId, today, 5),
    showCoaches
      ? getCoachesReport(supabase, clubId, from, to, today)
      : Promise.resolve([] as CoachReport[]),
  ]);

  const inProgress = rows.filter((e) => e.status === "in_progress").length;
  const pending = pendingCount ?? 0;
  const money = (n: number) => formatMoney(n, "ARS");
  const porCancha = courtsCount > 0 ? Math.round(kpis.recaudadoMes / courtsCount) : 0;

  const onboarding: OnboardingStep[] = [
    {
      label: "Completá los datos del club",
      description: "Nombre, ciudad y teléfono de contacto.",
      href: "/admin/settings",
      done: Boolean(club?.phone || club?.city),
    },
    {
      label: "Cargá tus canchas",
      description: "Agregá al menos una cancha con horarios y precio.",
      href: "/admin/settings",
      done: courtsCount > 0,
    },
    {
      label: "Configurá cómo cobrás",
      description: "Conectá Mercado Pago o habilitá el pago en el club.",
      href: "/admin/settings",
      done: Boolean(pay?.mp_connected || pay?.booking_pay_at_club),
    },
    {
      label: "Creá tu primer torneo",
      description: "Publicá un torneo para que los jugadores se inscriban.",
      href: "/admin/events",
      done: rows.length > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Inicio</h1>
        <p className="text-sm text-muted">
          {ctx.activeMembership.club.name} · indicadores del mes
        </p>
      </div>

      <OnboardingChecklist steps={onboarding} />

      {/* Plata */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Plata (mes)</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric label="Recaudado" value={money(kpis.recaudadoMes)} href="/admin/agenda" highlight />
          <Metric label="Por cobrar" value={money(kpis.porCobrarMes)} href="/admin/agenda" amber={kpis.porCobrarMes > 0} />
          <Metric label="Ingreso / cancha" value={money(porCancha)} href="/admin/agenda" />
          <Metric label="Ocupación de canchas" value={`${occ.ocupacionPct}%`} href="/admin/agenda" />
        </div>
      </section>

      {/* Actividad */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Actividad (mes)</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric label="Reservas" value={kpis.reservasMes} href="/admin/agenda" />
          <Metric label="Reservas del bot" value={kpis.reservasBotMes} href="/admin/agenda" />
          <Metric label="Clientes con reserva" value={kpis.clientesMes} href="/admin/agenda" />
          <Metric label="Jugadores nuevos" value={kpis.nuevosMes} href="/admin/players" />
        </div>
      </section>

      {/* Por profesor (pack avanzado) */}
      {showCoaches && coaches.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Por profesor (mes)
          </h2>
          <Card>
            <CardContent className="py-2">
              <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1.2fr] gap-3 border-b border-border-soft px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
                <span>Profesor</span>
                <span className="text-right">Clases</span>
                <span className="text-right">Grupos</span>
                <span className="text-right">Alumnos</span>
                <span className="text-right">Ingreso</span>
              </div>
              {coaches.map((c) => (
                <div
                  key={c.coach.id}
                  className="grid grid-cols-2 gap-2 border-b border-border-soft/60 px-2 py-3 text-sm last:border-0 sm:grid-cols-[2fr_1fr_1fr_1fr_1.2fr] sm:gap-3"
                >
                  <span className="font-semibold text-ink">{c.coach.name}</span>
                  <span className="text-right text-muted sm:text-ink">
                    <span className="text-muted sm:hidden">Clases </span>
                    {c.clasesMes}
                  </span>
                  <span className="text-right text-muted sm:text-ink">
                    <span className="text-muted sm:hidden">Grupos </span>
                    {c.gruposMes}
                  </span>
                  <span className="text-right text-muted sm:text-ink">
                    <span className="text-muted sm:hidden">Alumnos </span>
                    {c.alumnosMes}
                  </span>
                  <span className="text-right font-semibold text-ink">
                    {money(c.ingresoMes)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Comunidad y torneos */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 py-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Ranking del club
            </h2>
            {topPlayers.length === 0 ? (
              <p className="text-sm text-faint">Todavía no hay jugadores con ranking.</p>
            ) : (
              <ol className="space-y-2">
                {topPlayers.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-ink">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium text-ink">
                      {p.full_name}
                    </span>
                    <span className="text-sm text-muted">{Math.round(p.elo_rating)}</span>
                  </li>
                ))}
              </ol>
            )}
            <Link href="/admin/players" className="text-xs font-semibold text-accent">
              Ver jugadores →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 py-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Próximos eventos
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-faint">No hay eventos agendados.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-sm">
                    <Badge tone={e.event_type === "open_play" ? "live" : "open"}>
                      {TIPO[e.event_type] ?? "Evento"}
                    </Badge>
                    <span className="flex-1 truncate text-ink">{e.name}</span>
                    <span className="text-muted">{fmtDia(e.start_date)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-4 pt-1 text-xs text-muted">
              <span>Torneos activos: <b className="text-ink">{inProgress}</b></span>
              <span>
                Inscripciones pendientes:{" "}
                <b className={pending > 0 ? "text-amber-500" : "text-ink"}>{pending}</b>
              </span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  href,
  highlight = false,
  amber = false,
}: {
  label: string;
  value: number | string;
  href: string;
  highlight?: boolean;
  amber?: boolean;
}) {
  const color = amber
    ? "text-amber-500"
    : highlight
      ? "text-padel-600"
      : "text-ink";
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-padel-200">
        <CardContent className="py-5">
          <p className={`text-2xl font-semibold ${color}`}>{value}</p>
          <p className="mt-1 text-sm text-muted">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
