import Link from "next/link";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  eventStatusMeta,
  formatDate,
  formatMoney,
} from "@/lib/format";
import type { Enums, Tables } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type EventRow = Pick<
  Tables<"events">,
  | "id"
  | "name"
  | "slug"
  | "status"
  | "start_date"
  | "modality"
  | "long_format"
  | "max_teams"
  | "inscription_per_person"
  | "court_cost_month"
  | "court_pool_per_person"
  | "currency"
>;

type PaymentRow = Pick<
  Tables<"payments">,
  "event_id" | "amount" | "pool_amount" | "status"
>;

function modalityLabel(m: Enums<"tournament_modality"> | null): string {
  if (!m) return "—";
  const map: Record<Enums<"tournament_modality">, string> = {
    caballeros: "Caballeros",
    damas: "Damas",
    mixto: "Mixto",
    combinado: "Combinado",
  };
  return map[m] ?? m;
}

export default async function ProyeccionPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const { data: eventData } = await supabase
    .from("events")
    .select(
      "id, name, slug, status, start_date, modality, long_format, max_teams, inscription_per_person, court_cost_month, court_pool_per_person, currency"
    )
    .eq("club_id", ctx.activeClubId)
    .order("start_date", { ascending: false, nullsFirst: false });

  const allEvents = (eventData ?? []) as EventRow[];

  // Años disponibles (según start_date) para el filtro.
  const years = Array.from(
    new Set(
      allEvents
        .map((e) => (e.start_date ? e.start_date.slice(0, 4) : null))
        .filter((y): y is string => y !== null)
    )
  ).sort((a, b) => b.localeCompare(a));

  const activeYear =
    yearParam && years.includes(yearParam) ? yearParam : null;
  const events = activeYear
    ? allEvents.filter((e) => e.start_date?.slice(0, 4) === activeYear)
    : allEvents;

  const currency = events[0]?.currency ?? "ARS";
  const money = (n: number) => formatMoney(Math.round(n), currency);

  // Equipos aprobados por evento (fallback cuando no hay max_teams).
  const eventIds = events.map((e) => e.id);
  const approvedTeamsByEvent = new Map<string, number>();
  const collectedByEvent = new Map<string, number>();
  const poolByEvent = new Map<string, number>();

  if (eventIds.length > 0) {
    const [{ data: teamData }, { data: payData }] = await Promise.all([
      supabase.from("teams").select("event_id").in("event_id", eventIds),
      supabase
        .from("payments")
        .select("event_id, amount, pool_amount, status")
        .in("event_id", eventIds),
    ]);
    for (const t of (teamData ?? []) as { event_id: string }[]) {
      approvedTeamsByEvent.set(
        t.event_id,
        (approvedTeamsByEvent.get(t.event_id) ?? 0) + 1
      );
    }
    for (const p of (payData ?? []) as PaymentRow[]) {
      if (p.status !== "paid" || !p.event_id) continue;
      collectedByEvent.set(
        p.event_id,
        (collectedByEvent.get(p.event_id) ?? 0) + Number(p.amount)
      );
      poolByEvent.set(
        p.event_id,
        (poolByEvent.get(p.event_id) ?? 0) + Number(p.pool_amount)
      );
    }
  }

  type Computed = {
    event: EventRow;
    estPlayers: number;
    projGain: number;
    projCourtCost: number;
    projPool: number;
    realCollected: number;
    realPool: number;
  };

  const rows: Computed[] = events.map((e) => {
    const estPlayers =
      (e.max_teams ?? 0) > 0
        ? (e.max_teams as number) * 2
        : (approvedTeamsByEvent.get(e.id) ?? 0) * 2;
    const projGain = Number(e.inscription_per_person ?? 0) * estPlayers;
    const projCourtCost = Number(e.court_cost_month ?? 0);
    const projPool = Number(e.court_pool_per_person ?? 0) * estPlayers;
    return {
      event: e,
      estPlayers,
      projGain,
      projCourtCost,
      projPool,
      realCollected: collectedByEvent.get(e.id) ?? 0,
      realPool: poolByEvent.get(e.id) ?? 0,
    };
  });

  const totalProjGain = rows.reduce((s, r) => s + r.projGain, 0);
  const totalRealCollected = rows.reduce((s, r) => s + r.realCollected, 0);
  const totalRealPool = rows.reduce((s, r) => s + r.realPool, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Proyección anual</h1>
        {years.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/admin/proyeccion"
              className={`rounded-lg px-3 py-1 font-medium ${
                activeYear === null
                  ? "bg-accent text-accent-ink"
                  : "text-muted hover:bg-surface-2"
              }`}
            >
              Todos
            </Link>
            {years.map((y) => (
              <Link
                key={y}
                href={`/admin/proyeccion?year=${y}`}
                className={`rounded-lg px-3 py-1 font-medium ${
                  activeYear === y
                    ? "bg-accent text-accent-ink"
                    : "text-muted hover:bg-surface-2"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Ganancia proyectada" value={money(totalProjGain)} />
        <MetricCard
          label="Recaudado real"
          value={money(totalRealCollected)}
        />
        <MetricCard label="Pozo real" value={money(totalRealPool)} />
        <MetricCard label="Torneos" value={String(rows.length)} />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            No hay torneos para mostrar.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-soft text-left text-xs uppercase text-muted">
                  <th className="px-4 py-3">Torneo</th>
                  <th className="px-2 py-3 text-right">Ganancia proy.</th>
                  <th className="px-2 py-3 text-right">Costo cancha proy.</th>
                  <th className="px-2 py-3 text-right">Pozo proy.</th>
                  <th className="px-2 py-3 text-right">Recaudado real</th>
                  <th className="px-4 py-3 text-right">Pozo real</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                {rows.map((r) => {
                  const meta = eventStatusMeta(r.event.status);
                  return (
                    <tr
                      key={r.event.id}
                      className="border-b border-border-soft last:border-0"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/events/${r.event.id}`}
                          className="font-semibold text-ink hover:text-padel-700"
                        >
                          {r.event.name}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          <span>{modalityLabel(r.event.modality)}</span>
                          <span>{formatDate(r.event.start_date)}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right">
                        {money(r.projGain)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {money(r.projCourtCost)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {money(r.projPool)}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold">
                        {money(r.realCollected)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {money(r.realPool)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </p>
        <p className="mt-1 text-xl font-bold text-ink">{value}</p>
      </CardContent>
    </Card>
  );
}
