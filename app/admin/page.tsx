import Link from "next/link";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { getClubDashboard } from "@/modules/tournaments/repository";
import { countClubPlayers } from "@/modules/players/repository";
import { countClubCourts, getClubInfo } from "@/modules/clubs/repository";
import { getClubPaymentSettings } from "@/modules/payments/repository";
import { getClubKpis } from "@/modules/dashboard/repository";
import {
  OnboardingChecklist,
  type OnboardingStep,
} from "@/components/admin/onboarding-checklist";

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");
/** Rango del mes actual (horario AR, UTC-3) en YYYY-MM-DD. */
function monthRange(): [string, string] {
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0-based
  const from = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
  return [from, to];
}

export default async function AdminDashboard() {
  const ctx = await getAdminContext();
  const clubId = ctx.activeClubId;
  const supabase = await createClient();
  const [from, to] = monthRange();

  const [
    { events: rows, pendingCount },
    playersCount,
    courtsCount,
    club,
    pay,
    kpis,
  ] = await Promise.all([
    getClubDashboard(supabase, clubId),
    countClubPlayers(supabase, clubId),
    countClubCourts(supabase, clubId),
    getClubInfo(supabase, clubId),
    getClubPaymentSettings(supabase, clubId),
    getClubKpis(supabase, clubId, from, to),
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
          <Metric label="Reservas" value={kpis.reservasMes} href="/admin/agenda" />
        </div>
      </section>

      {/* Actividad */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Actividad (mes)</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric label="Clientes con reserva" value={kpis.clientesMes} href="/admin/agenda" />
          <Metric label="Jugadores nuevos" value={kpis.nuevosMes} href="/admin/players" />
          <Metric label="Clases y entrenamientos" value={kpis.clasesMes} href="/admin/clases" />
          <Metric label="Jugadores del club" value={playersCount} href="/admin/players" />
        </div>
      </section>

      {/* Bot y captación */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Bot y captación (mes)</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric label="Reservas del bot" value={kpis.reservasBotMes} href="/admin/agenda" />
          <Metric label="Invitaciones gestionadas" value={kpis.invitacionesMes} href="/admin/events" />
        </div>
      </section>

      {/* Torneos */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Torneos</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric label="Torneos activos" value={inProgress} href="/admin/events" />
          <Metric label="Inscripciones pendientes" value={pending} href="/admin/events" amber={pending > 0} />
        </div>
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
