import Link from "next/link";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getClubDashboard } from "@/modules/tournaments/repository";
import { listDayBookingsWithCourt } from "@/modules/reservations/repository";
import { countClubPlayers } from "@/modules/players/repository";
import { countClubCourts, getClubInfo } from "@/modules/clubs/repository";
import { getClubPaymentSettings } from "@/modules/payments/repository";
import {
  OnboardingChecklist,
  type OnboardingStep,
} from "@/components/admin/onboarding-checklist";

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");
/** Fecha de hoy en horario de Argentina (UTC-3). */
function todayAR(): string {
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
const hhmm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export default async function AdminDashboard() {
  const ctx = await getAdminContext();
  const clubId = ctx.activeClubId;
  const supabase = await createClient();
  const today = todayAR();

  const [
    { events: rows, pendingCount },
    todayBookings,
    playersCount,
    courtsCount,
    club,
    pay,
  ] = await Promise.all([
    getClubDashboard(supabase, clubId),
    listDayBookingsWithCourt(supabase, clubId, today),
    countClubPlayers(supabase, clubId),
    countClubCourts(supabase, clubId),
    getClubInfo(supabase, clubId),
    getClubPaymentSettings(supabase, clubId),
  ]);

  const inProgress = rows.filter((e) => e.status === "in_progress").length;
  const pending = pendingCount ?? 0;

  // Checklist de puesta en marcha del club.
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
  // Reservas de hoy: turnos con cliente (excluye bloqueos de torneo).
  const reservationsToday = todayBookings.filter(
    (b) => b.kind !== "tournament" && b.status !== "blocked"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Inicio</h1>
        <p className="text-sm text-muted">{ctx.activeMembership.club.name}</p>
      </div>

      <OnboardingChecklist steps={onboarding} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Reservas hoy" value={reservationsToday.length} href="/admin/agenda" />
        <Metric label="Jugadores del club" value={playersCount} href="/admin/players" />
        <Metric label="Torneos activos" value={inProgress} href="/admin/events" />
        <Metric
          label="Inscripciones pendientes"
          value={pending}
          href="/admin/events"
          highlight={pending > 0}
        />
      </div>

      {/* Hoy en la agenda */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Hoy en la agenda</h2>
          <Link
            href="/admin/agenda"
            className="text-sm font-semibold text-padel-600 hover:text-padel-700"
          >
            Ver agenda
          </Link>
        </div>
        {reservationsToday.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted">
              No hay reservas para hoy todavía.{" "}
              <Link href="/admin/agenda" className="font-semibold text-padel-600">
                Cargar una reserva
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {reservationsToday.slice(0, 8).map((b) => {
              const held = b.status === "held";
              return (
                <Card key={b.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <span className="font-mono text-sm font-semibold text-ink">
                      {hhmm(b.start_minutes)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {b.customer_name ?? "Reserva"}
                      </p>
                      <p className="text-xs text-muted">
                        {b.court_number ? `#${b.court_number} · ` : ""}
                        {b.court_name}
                      </p>
                    </div>
                    <Badge tone={held ? "draft" : "open"}>
                      {held ? "En proceso" : "Reservada"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
            {reservationsToday.length > 8 && (
              <p className="pt-1 text-center text-xs text-muted">
                +{reservationsToday.length - 8} reservas más hoy
              </p>
            )}
          </div>
        )}
      </section>

    </div>
  );
}

function Metric({
  label,
  value,
  href,
  highlight = false,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-padel-200">
        <CardContent className="py-5">
          <p
            className={
              highlight
                ? "text-3xl font-semibold text-amber-500"
                : "text-3xl font-semibold text-padel-600"
            }
          >
            {value}
          </p>
          <p className="mt-1 text-sm text-muted">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
