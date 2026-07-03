"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  registrationStatusLabel,
  formatMoney,
  formatDate,
  modalityLabel,
} from "@/lib/format";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  approveRegistration,
  rejectRegistration,
  waitlistRegistration,
  generateZones,
  recordMatchResult,
  updateEventSettings,
  startTournament,
  markPaymentPaid,
  markPaymentPending,
  saveEventEconomics,
  generateFixture,
  recordLeagueResult,
  generateBracket,
} from "@/app/admin/events/[id]/actions";
import { BracketView, isBracketMatch } from "@/components/bracket-view";
import type { Enums, Tables } from "@/lib/database.types";

type Registration = Tables<"registrations">;
type Team = Tables<"teams">;
type Zone = Tables<"zones">;
type Match = Tables<"matches">;
type Category = Pick<Tables<"categories">, "id" | "name">;
type Payment = Tables<"payments">;
type Round = Tables<"rounds">;
type PlayerStanding = Tables<"player_standings">;
type PlayerName = Pick<Tables<"players">, "id" | "full_name">;
type CourtName = Pick<Tables<"courts">, "id" | "name">;

const LEAGUE_FORMATS: ReadonlyArray<Enums<"tournament_format">> = [
  "liga_ida",
  "liga_ida_vuelta",
  "liga_playoff",
];

/** Liga de equipos (round-robin con posiciones por zona). */
function isLeagueFormat(
  lf: Enums<"tournament_format"> | null
): boolean {
  return lf != null && LEAGUE_FORMATS.includes(lf);
}

/** Americano (parejas rotativas, ranking individual). */
function isAmericanoFormat(
  lf: Enums<"tournament_format"> | null
): boolean {
  return lf === "americano";
}

export interface EventManagerData {
  event: Tables<"events">;
  registrations: Registration[];
  teams: Team[];
  zones: Zone[];
  zoneTeams: Tables<"zone_teams">[];
  matches: Match[];
  categories: Category[];
  payments: Payment[];
  rounds: Round[];
  playerStandings: PlayerStanding[];
  players: PlayerName[];
  courts: CourtName[];
  rivalClubs: { id: string; name: string }[];
}

export function EventManager({ data }: { data: EventManagerData }) {
  const league = isLeagueFormat(data.event.long_format);
  const americano = isAmericanoFormat(data.event.long_format);
  // Calendario + Ranking individual están disponibles para liga y americano.
  const hasFixture = league || americano;
  const [tab, setTab] = useState("registrations");
  const teamName = (id: string | null) =>
    (id && data.teams.find((t) => t.id === id)?.name) || "Equipo";

  const tabs = useMemo(() => {
    const base = [
      { value: "registrations", label: "Inscripciones" },
      { value: "teams", label: "Equipos" },
      // Americano: parejas rotativas sin posiciones por zona → sin Zonas.
      ...(americano ? [] : [{ value: "zones", label: "Zonas" }]),
      // Americano: el ranking que vale es el individual → sin Partidos por zona.
      ...(americano ? [] : [{ value: "matches", label: "Partidos" }]),
      // El cuadro de eliminación no aplica al americano.
      ...(americano ? [] : [{ value: "bracket", label: "Cuadro" }]),
      { value: "calendar", label: "Calendario" },
      { value: "ranking", label: "Ranking" },
      { value: "planner", label: "Planificador" },
      { value: "finances", label: "Finanzas" },
      { value: "settings", label: "Ajustes" },
    ];
    return base;
  }, [americano]);

  return (
    <div className="space-y-6">
      <Tabs tabs={tabs} value={tab} onValueChange={setTab} />
      {tab === "registrations" && <RegistrationsTab data={data} />}
      {tab === "teams" && <TeamsTab data={data} />}
      {tab === "zones" && !americano && (
        <ZonesTab data={data} teamName={teamName} />
      )}
      {tab === "matches" && !americano && (
        <MatchesTab data={data} teamName={teamName} />
      )}
      {tab === "bracket" && !americano && (
        <BracketTab data={data} teamName={teamName} />
      )}
      {tab === "calendar" && (
        <CalendarTab
          data={data}
          teamName={teamName}
          hasFixture={hasFixture}
          americano={americano}
        />
      )}
      {tab === "ranking" && <RankingTab data={data} league={hasFixture} />}
      {tab === "planner" && <PlannerTab data={data} />}
      {tab === "finances" && <FinancesTab data={data} />}
      {tab === "settings" && <SettingsTab data={data} />}
    </div>
  );
}

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string } | void>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res && "ok" in res && !res.ok) setError(res.error ?? "Error");
      else router.refresh();
    });
  };
  return { run, pending, error };
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-black/10 bg-surface p-10 text-center text-muted">
      {text}
    </div>
  );
}

/**
 * Filtro por modalidad para torneos combinados (Bloque M2). Deriva las
 * modalidades presentes en las zonas y deja elegir una (o "Todas"). Devuelve
 * null si no aplica (evento no combinado o sin modalidades).
 */
function useModalityFilter(data: EventManagerData) {
  const combinado = data.event.modality === "combinado";
  const modalities = useMemo(() => {
    const set = new Set<Enums<"tournament_modality">>();
    for (const z of data.zones) if (z.modality) set.add(z.modality);
    return Array.from(set);
  }, [data.zones]);
  const [selected, setSelected] =
    useState<Enums<"tournament_modality"> | null>(null);
  const show = combinado && modalities.length > 0;
  return { show, modalities, selected, setSelected };
}

function ModalityFilter({
  modalities,
  selected,
  onSelect,
}: {
  modalities: Enums<"tournament_modality">[];
  selected: Enums<"tournament_modality"> | null;
  onSelect: (m: Enums<"tournament_modality"> | null) => void;
}) {
  const btn = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ${
      active
        ? "bg-padel-600 text-white"
        : "border border-border-soft bg-surface text-muted"
    }`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={btn(selected === null)} onClick={() => onSelect(null)}>
        Todas
      </button>
      {modalities.map((m) => (
        <button
          key={m}
          type="button"
          className={btn(selected === m)}
          onClick={() => onSelect(m)}
        >
          {modalityLabel(m)}
        </button>
      ))}
    </div>
  );
}

const REG_TONE: Record<Enums<"registration_status">, "open" | "live" | "closed" | "neutral" | "draft"> = {
  pending: "draft",
  approved: "open",
  rejected: "closed",
  waitlist: "neutral",
  cancelled: "neutral",
};

function RegistrationsTab({ data }: { data: EventManagerData }) {
  const { run, pending, error } = useAction();
  const eventId = data.event.id;

  if (data.registrations.length === 0)
    return <EmptyState text="Todavía no hay inscripciones." />;

  return (
    <div className="space-y-3">
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {data.registrations.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="font-semibold text-ink">
                {r.player_1_name}
                {r.player_2_name ? ` / ${r.player_2_name}` : ""}
              </p>
              <p className="text-xs text-muted">
                {r.player_1_phone ?? "—"}
                {r.waitlist_position
                  ? ` · Espera #${r.waitlist_position}`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={REG_TONE[r.status]}>
                {registrationStatusLabel(r.status)}
              </Badge>
              {r.status !== "approved" && (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => approveRegistration(eventId, r.id))}
                >
                  Aprobar
                </Button>
              )}
              {r.status !== "waitlist" && r.status !== "approved" && (
                <Button
                  size="sm"
                  variant="subtle"
                  disabled={pending}
                  onClick={() => run(() => waitlistRegistration(eventId, r.id))}
                >
                  Espera
                </Button>
              )}
              {r.status !== "rejected" && r.status !== "approved" && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => rejectRegistration(eventId, r.id))}
                >
                  Rechazar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TeamsTab({ data }: { data: EventManagerData }) {
  if (data.teams.length === 0)
    return (
      <EmptyState text="No hay equipos. Aprobá inscripciones para crearlos." />
    );
  return (
    <div className="space-y-2">
      {data.teams.map((t, i) => (
        <Card key={t.id}>
          <CardContent className="flex items-center justify-between py-3">
            <span className="font-semibold text-ink">
              {t.name || `Equipo ${i + 1}`}
            </span>
            {t.seed != null && (
              <span className="text-xs text-muted">Seed {t.seed}</span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ZonesTab({
  data,
  teamName,
}: {
  data: EventManagerData;
  teamName: (id: string | null) => string;
}) {
  const { run, pending, error } = useAction();
  const filter = useModalityFilter(data);
  const teamsByZone = new Map<string, string[]>();
  for (const zt of data.zoneTeams) {
    if (!teamsByZone.has(zt.zone_id)) teamsByZone.set(zt.zone_id, []);
    teamsByZone.get(zt.zone_id)!.push(zt.team_id);
  }
  const visibleZones = filter.selected
    ? data.zones.filter((z) => z.modality === filter.selected)
    : data.zones;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {data.teams.length} equipos · {data.zones.length} zonas
        </p>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => generateZones(data.event.id))}
        >
          {data.zones.length > 0 ? "Regenerar zonas" : "Generar zonas"}
        </Button>
      </div>
      {filter.show && (
        <ModalityFilter
          modalities={filter.modalities}
          selected={filter.selected}
          onSelect={filter.setSelected}
        />
      )}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      {data.zones.length === 0 ? (
        <EmptyState text="Todavía no se generaron zonas." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleZones.map((z) => (
            <Card key={z.id}>
              <CardContent className="py-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-bold text-padel-700">{z.name}</h3>
                  {filter.show && z.modality && (
                    <Badge tone="neutral">{modalityLabel(z.modality)}</Badge>
                  )}
                </div>
                <ul className="space-y-1 text-sm text-ink">
                  {(teamsByZone.get(z.id) ?? []).map((tid) => (
                    <li key={tid}>{teamName(tid)}</li>
                  ))}
                  {(teamsByZone.get(z.id) ?? []).length === 0 && (
                    <li className="text-muted">Sin equipos</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchesTab({
  data,
  teamName,
}: {
  data: EventManagerData;
  teamName: (id: string | null) => string;
}) {
  const filter = useModalityFilter(data);
  const zoneModality = useMemo(() => {
    const map = new Map<string, Enums<"tournament_modality"> | null>();
    for (const z of data.zones) map.set(z.id, z.modality);
    return map;
  }, [data.zones]);

  if (data.matches.length === 0)
    return (
      <EmptyState text="No hay partidos. Iniciá el torneo desde Ajustes." />
    );

  const visible = filter.selected
    ? data.matches.filter(
        (m) => m.zone_id != null && zoneModality.get(m.zone_id) === filter.selected
      )
    : data.matches;

  return (
    <div className="space-y-2">
      {filter.show && (
        <ModalityFilter
          modalities={filter.modalities}
          selected={filter.selected}
          onSelect={filter.setSelected}
        />
      )}
      {visible.map((m) => (
        <MatchRow
          key={m.id}
          match={m}
          eventId={data.event.id}
          teamName={teamName}
          modality={
            filter.show && m.zone_id != null
              ? zoneModality.get(m.zone_id) ?? null
              : null
          }
        />
      ))}
    </div>
  );
}

function MatchRow({
  match,
  eventId,
  teamName,
  modality = null,
}: {
  match: Match;
  eventId: string;
  teamName: (id: string | null) => string;
  modality?: Enums<"tournament_modality"> | null;
}) {
  const { run, pending, error } = useAction();
  const done = match.status === "completed";

  return (
    <Card>
      <CardContent className="py-3">
        {modality && (
          <div className="mb-2">
            <Badge tone="neutral">{modalityLabel(modality)}</Badge>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm">
            <span
              className={
                match.winner_team_id === match.team_a_id
                  ? "font-bold text-ink"
                  : "text-muted"
              }
            >
              {teamName(match.team_a_id)}
            </span>
            <span className="px-2 text-muted">vs</span>
            <span
              className={
                match.winner_team_id === match.team_b_id
                  ? "font-bold text-ink"
                  : "text-muted"
              }
            >
              {teamName(match.team_b_id)}
            </span>
          </div>
          {done ? (
            <Badge tone="open">
              {match.games_a} – {match.games_b}
            </Badge>
          ) : (
            <form
              action={(fd) => run(() => recordMatchResult(eventId, match.id, fd))}
              className="flex items-center gap-2"
            >
              <input
                name="games_a"
                type="number"
                min={0}
                required
                className="w-14 rounded-md border border-black/10 px-2 py-1 text-sm"
                aria-label="Games equipo A"
              />
              <span className="text-muted">–</span>
              <input
                name="games_b"
                type="number"
                min={0}
                required
                className="w-14 rounded-md border border-black/10 px-2 py-1 text-sm"
                aria-label="Games equipo B"
              />
              <Button size="sm" type="submit" disabled={pending}>
                Guardar
              </Button>
            </form>
          )}
        </div>
        {error && (
          <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Cuadro de eliminación                                               */
/* ------------------------------------------------------------------ */

function BracketTab({
  data,
  teamName,
}: {
  data: EventManagerData;
  teamName: (id: string | null) => string;
}) {
  const { run, pending, error } = useAction();
  const bracketMatches = useMemo(
    () => data.matches.filter(isBracketMatch),
    [data.matches]
  );
  // Partidos del cuadro con ambos equipos definidos y sin resultado cargado.
  const pendingResults = bracketMatches.filter(
    (m) =>
      m.team_a_id != null &&
      m.team_b_id != null &&
      m.status !== "completed"
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="min-w-0">
            <h3 className="font-bold text-ink">Cuadro de eliminación</h3>
            <p className="text-sm text-muted">
              Genera el cuadro de eliminación desde las posiciones (regenera si
              ya existe).
            </p>
          </div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => generateBracket(data.event.id))}
          >
            {bracketMatches.length > 0 ? "Regenerar cuadro" : "Generar cuadro"}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <BracketView matches={bracketMatches} teamName={teamName} />

      {pendingResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="fp-microlabel text-padel-600">Cargar resultados</h3>
          {pendingResults.map((m) => (
            <BracketResultRow
              key={m.id}
              match={m}
              eventId={data.event.id}
              teamName={teamName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BracketResultRow({
  match,
  eventId,
  teamName,
}: {
  match: Match;
  eventId: string;
  teamName: (id: string | null) => string;
}) {
  const { run, pending, error } = useAction();
  return (
    <div className="rounded-lg border border-border-soft bg-surface px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-sm">
          <span className="text-ink">{teamName(match.team_a_id)}</span>
          <span className="px-2 text-muted">vs</span>
          <span className="text-ink">{teamName(match.team_b_id)}</span>
        </div>
        <LeagueResultForm
          eventId={eventId}
          matchId={match.id}
          run={run}
          pending={pending}
        />
      </div>
      {error && (
        <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
}

function PaymentLine({
  label,
  payment,
  eventId,
  money,
  run,
  pending,
}: {
  label: string;
  payment: Payment | null;
  eventId: string;
  money: (n: number) => string;
  run: (fn: () => Promise<{ ok: boolean; error?: string } | void>) => void;
  pending: boolean;
}) {
  const paid = payment?.status === "paid";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-2 first:border-0 first:pt-0">
      <div className="min-w-0 text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="ml-2 text-muted">
          {payment ? money(Number(payment.amount)) : "—"}
        </span>
        {payment && Number(payment.pool_amount) > 0 && (
          <span className="ml-2 text-xs text-muted">
            (pozo {money(Number(payment.pool_amount))})
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={paid ? "open" : "draft"}>
          {paid ? "Pagado" : "Pendiente"}
        </Badge>
        {payment ? (
          <Button
            size="sm"
            variant={paid ? "ghost" : "primary"}
            disabled={pending}
            onClick={() =>
              run(() =>
                paid
                  ? markPaymentPending(eventId, payment.id)
                  : markPaymentPaid(eventId, payment.id)
              )
            }
          >
            {paid ? "Marcar pendiente" : "Marcar pagado"}
          </Button>
        ) : (
          <span className="text-xs text-muted">Sin pago</span>
        )}
      </div>
    </div>
  );
}

function FinancesTab({ data }: { data: EventManagerData }) {
  const { run, pending, error } = useAction();
  const e = data.event;
  const chargeCourt = e.charge_court ?? false;
  const money = (n: number) => formatMoney(n, e.currency);

  const isPaid = (p: Payment) => p.status === "paid";
  const isPending = (p: Payment) => p.status === "pending";

  // Métricas separadas por kind/estado.
  const inscriptionCollected = data.payments
    .filter((p) => p.kind === "inscription" && isPaid(p))
    .reduce((s, p) => s + Number(p.amount), 0);
  const courtCollected = data.payments
    .filter((p) => p.kind === "court_fee" && isPaid(p))
    .reduce((s, p) => s + Number(p.amount), 0);
  const pool = data.payments
    .filter((p) => p.kind === "court_fee" && isPaid(p))
    .reduce((s, p) => s + Number(p.pool_amount), 0);
  const outstanding = data.payments
    .filter(isPending)
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalCollected = inscriptionCollected + courtCollected;

  // Pagos agrupados por inscripción.
  const approved = data.registrations.filter((r) => r.status === "approved");
  const paymentsByReg = new Map<string, Payment[]>();
  for (const p of data.payments) {
    if (!p.registration_id) continue;
    if (!paymentsByReg.has(p.registration_id))
      paymentsByReg.set(p.registration_id, []);
    paymentsByReg.get(p.registration_id)!.push(p);
  }
  const findKind = (regId: string, kind: Enums<"payment_kind">) =>
    (paymentsByReg.get(regId) ?? []).find((p) => p.kind === kind) ?? null;

  return (
    <div className="space-y-6">
      <div
        className={`grid gap-3 sm:grid-cols-2 ${
          chargeCourt ? "lg:grid-cols-5" : "lg:grid-cols-3"
        }`}
      >
        <MetricCard
          label="Inscripción recaudada"
          value={money(inscriptionCollected)}
        />
        {chargeCourt && (
          <>
            <MetricCard label="Cancha recaudada" value={money(courtCollected)} />
            <MetricCard label="Pozo" value={money(pool)} />
          </>
        )}
        <MetricCard label="Por cobrar" value={money(outstanding)} />
        <MetricCard label="Total recaudado" value={money(totalCollected)} />
      </div>

      {chargeCourt && (
        <p className="text-xs text-muted">
          La ganancia es la inscripción recaudada; el pozo surge del markup de
          los pagos de cancha cobrados.
        </p>
      )}

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      {approved.length === 0 ? (
        <EmptyState text="No hay inscripciones aprobadas todavía." />
      ) : (
        <div className="space-y-2">
          {approved.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-4">
                <p className="mb-3 font-semibold text-ink">
                  {r.player_1_name}
                  {r.player_2_name ? ` / ${r.player_2_name}` : ""}
                </p>
                <div className="space-y-2">
                  <PaymentLine
                    label="Inscripción"
                    payment={findKind(r.id, "inscription")}
                    eventId={e.id}
                    money={money}
                    run={run}
                    pending={pending}
                  />
                  {chargeCourt && (
                    <PaymentLine
                      label="Cancha"
                      payment={findKind(r.id, "court_fee")}
                      eventId={e.id}
                      money={money}
                      run={run}
                      pending={pending}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Planificador (FASE 1 — motor económico)                             */
/* ------------------------------------------------------------------ */

type LongFormat = Enums<"tournament_format">;
/** Tipo de torneo en la UI: null = "un día" (torneo corto). */
type TournamentType = LongFormat | "un_dia";

const TYPE_OPTIONS: { value: TournamentType; label: string }[] = [
  { value: "un_dia", label: "Un día (grupos + eliminación)" },
  { value: "liga_ida", label: "Liga ida" },
  { value: "liga_ida_vuelta", label: "Liga ida y vuelta" },
  { value: "liga_playoff", label: "Liga + playoff" },
  { value: "americano", label: "Americano (estimado)" },
];

/** Convierte el long_format del evento (o null) al valor de la UI. */
function typeFromLongFormat(lf: LongFormat | null): TournamentType {
  return lf ?? "un_dia";
}

/** Convierte el valor de la UI al long_format persistible (null = un día). */
function longFormatFromType(t: TournamentType): LongFormat | null {
  return t === "un_dia" ? null : t;
}

/** Indica si el tipo es una liga larga (vs torneo de un día). */
function isLeague(t: TournamentType): boolean {
  return t !== "un_dia";
}

/** Partidos totales según tipo de torneo y cantidad de equipos n. */
function totalMatches(type: TournamentType, n: number): number {
  if (n < 2) return 0;
  switch (type) {
    case "un_dia": {
      // Estimado: grupos (zonas round-robin de ~4) + playoff.
      const zonas = Math.ceil(n / 4);
      const grupos = zonas * 6; // round-robin de ~4 equipos = 6 partidos
      const clasificados = zonas * 2;
      const playoff = Math.max(0, clasificados - 1);
      return grupos + playoff;
    }
    case "liga_ida":
      return (n * (n - 1)) / 2;
    case "liga_ida_vuelta":
      return n * (n - 1);
    case "liga_playoff":
      return (n * (n - 1)) / 2 + (n - 1);
    case "americano":
      // Fase 1: usamos liga_ida como base (estimado).
      return (n * (n - 1)) / 2;
    default:
      return 0;
  }
}

/** El conteo de partidos es estimado para "un día" y "americano". */
function isEstimated(type: TournamentType): boolean {
  return type === "un_dia" || type === "americano";
}

function PlannerTab({ data }: { data: EventManagerData }) {
  const { run, pending, error } = useAction();
  const e = data.event;
  const money = (n: number) => formatMoney(Math.round(n), e.currency);

  const approvedTeams = data.teams.length;
  const defaultTeams = e.max_teams || approvedTeams || 8;

  const [type, setType] = useState<TournamentType>(
    typeFromLongFormat(e.long_format)
  );
  const [chargeCourt, setChargeCourt] = useState<boolean>(
    e.charge_court ?? isLeague(typeFromLongFormat(e.long_format))
  );
  const [teams, setTeams] = useState<number>(defaultTeams);

  // Al cambiar el tipo, sugerimos charge_court (el usuario puede overridear).
  const onTypeChange = (next: TournamentType) => {
    setType(next);
    setChargeCourt(isLeague(next));
  };
  const [courtCost, setCourtCost] = useState<number>(
    Number(e.court_cost_month ?? 0)
  );
  const [perCourt, setPerCourt] = useState<number>(
    Number(e.matches_per_court_month ?? 4)
  );
  const [markup, setMarkup] = useState<number>(Number(e.markup_pct ?? 40));
  const [inscription, setInscription] = useState<number>(
    Number(e.inscription_per_person ?? 0)
  );

  const calc = useMemo(() => {
    const n = Math.max(0, Math.floor(teams));
    const costPerMatch = perCourt > 0 ? courtCost / perCourt : 0;
    const matches = totalMatches(type, n);
    const players = n * 2;
    const courtTotal = matches * costPerMatch;
    const courtPerPlayer = players > 0 ? courtTotal / players : 0;
    // Si no se cobra la cancha: cuota cancha = 0, pozo = 0, paga = solo inscripción.
    const courtFeePerPlayer = chargeCourt
      ? courtPerPlayer * (1 + markup / 100)
      : 0;
    const pozo = chargeCourt
      ? courtPerPlayer * (markup / 100) * players
      : 0;
    const ganancia = inscription * players;
    const payPerPlayer = chargeCourt
      ? inscription + courtFeePerPlayer
      : inscription;

    // Canchas vs duración. El costo total NO cambia con C.
    const courtOptions = Array.from(
      new Set([1, 2, Math.max(1, Math.floor(n / 2))])
    ).sort((a, b) => a - b);
    const schedule = courtOptions.map((c) => {
      const weeks = c > 0 ? Math.ceil(matches / c) : 0;
      return { courts: c, weeks, months: weeks / 4.345 };
    });

    return {
      n,
      costPerMatch,
      matches,
      players,
      courtTotal,
      courtPerPlayer,
      courtFeePerPlayer,
      pozo,
      ganancia,
      payPerPlayer,
      schedule,
    };
  }, [type, chargeCourt, teams, courtCost, perCourt, markup, inscription]);

  const inputCls =
    "w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-ink";

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="py-5">
          <form
            action={(fd) => run(() => saveEventEconomics(e.id, fd))}
            className="space-y-4"
          >
            {/* Hidden inputs to persist the live-edited values. */}
            <input
              type="hidden"
              name="long_format"
              value={longFormatFromType(type) ?? ""}
            />
            <input
              type="hidden"
              name="charge_court"
              value={chargeCourt ? "on" : "off"}
            />
            <input type="hidden" name="court_cost_month" value={courtCost} />
            <input
              type="hidden"
              name="matches_per_court_month"
              value={perCourt}
            />
            <input type="hidden" name="markup_pct" value={markup} />
            <input
              type="hidden"
              name="inscription_per_person"
              value={inscription}
            />
            <input type="hidden" name="teams" value={teams} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de torneo">
                <select
                  value={type}
                  onChange={(ev) =>
                    onTypeChange(ev.target.value as TournamentType)
                  }
                  className={inputCls}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cantidad de equipos">
                <input
                  type="number"
                  min={2}
                  value={teams}
                  onChange={(ev) => setTeams(Number(ev.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Costo cancha / mes (${e.currency})`}>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={courtCost}
                  onChange={(ev) => setCourtCost(Number(ev.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Partidos por cancha-mes">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={perCourt}
                  onChange={(ev) => setPerCourt(Number(ev.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Markup %">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={markup}
                  onChange={(ev) => setMarkup(Number(ev.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label={`Inscripción por persona (${e.currency})`}>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={inscription}
                  onChange={(ev) => setInscription(Number(ev.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={chargeCourt}
                onChange={(ev) => setChargeCourt(ev.target.checked)}
                className="h-4 w-4"
              />
              Cobrar cancha aparte
            </label>

            {!chargeCourt && (
              <p className="text-xs text-muted">
                Cancha no se cobra (incluida): la cuota y el pozo quedan en $0;
                el jugador paga solo la inscripción.
              </p>
            )}

            {type === "americano" && (
              <p className="text-xs text-muted">
                El formato americano usa liga (ida) como base — valor estimado.
              </p>
            )}

            {error && (
              <p className="text-sm font-semibold text-red-600">{error}</p>
            )}
            <Button type="submit" size="sm" disabled={pending}>
              Guardar configuración
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={
            isEstimated(type) ? "Partidos totales (estimado)" : "Partidos totales"
          }
          value={String(calc.matches)}
        />
        <MetricCard label="Costo por partido" value={money(calc.costPerMatch)} />
        <MetricCard label="Costo cancha total" value={money(calc.courtTotal)} />
        <MetricCard
          label="Costo cancha / jugador"
          value={money(calc.courtPerPlayer)}
        />
        <MetricCard
          label="Cuota cancha / jugador"
          value={money(calc.courtFeePerPlayer)}
        />
        <MetricCard label="Pozo proyectado" value={money(calc.pozo)} />
        <MetricCard label="Ganancia" value={money(calc.ganancia)} />
        <MetricCard label="Paga por jugador" value={money(calc.payPerPlayer)} />
      </div>

      {chargeCourt && (
        <p className="text-xs text-muted">
          El pozo proyectado es estimado; el pozo real surge de los pagos de
          cancha efectivamente cobrados (ver Finanzas).
        </p>
      )}

      {!chargeCourt && (
        <p className="text-xs font-semibold text-muted">
          Cancha no se cobra (incluida). Los costos de cancha se muestran solo
          como referencia; la cuota de cancha y el pozo quedan en $0.
        </p>
      )}

      {isLeague(type) && chargeCourt ? (
        <Card>
          <CardContent className="py-5">
            <h3 className="mb-3 font-bold text-ink">Canchas vs duración</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="py-2 pr-4 font-semibold">Canchas</th>
                    <th className="py-2 pr-4 font-semibold">Semanas</th>
                    <th className="py-2 font-semibold">Meses</th>
                  </tr>
                </thead>
                <tbody className="text-ink">
                  {calc.schedule.map((s) => (
                    <tr key={s.courts} className="border-t border-border-soft">
                      <td className="py-2 pr-4">{s.courts}</td>
                      <td className="py-2 pr-4">{s.weeks}</td>
                      <td className="py-2">{Math.round(s.months)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              El costo total no cambia con la cantidad de canchas: solo varía la
              duración.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-5">
            <h3 className="mb-1 font-bold text-ink">Canchas vs duración</h3>
            <p className="text-xs text-muted">
              {!isLeague(type)
                ? "Torneo de un día: se juega en una jornada."
                : "Cancha no se cobra: la duración por canchas no aplica."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendario (FASE 2 — liga larga)                                    */
/* ------------------------------------------------------------------ */

function timeOf(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "HH:mm", { locale: es });
  } catch {
    return "—";
  }
}

function CalendarTab({
  data,
  teamName,
  hasFixture,
  americano,
}: {
  data: EventManagerData;
  teamName: (id: string | null) => string;
  hasFixture: boolean;
  americano: boolean;
}) {
  const { run, pending, error } = useAction();
  const e = data.event;

  if (!hasFixture) {
    return (
      <EmptyState text="Disponible para torneos de liga o americano; configurá el formato en Planificador." />
    );
  }

  // Matches con jornada (round_id seteado): liga y americano.
  const leagueMatches = data.matches.filter((m) => m.round_id != null);
  const matchesByRound = new Map<string, Match[]>();
  for (const m of leagueMatches) {
    const key = m.round_id as string;
    if (!matchesByRound.has(key)) matchesByRound.set(key, []);
    matchesByRound.get(key)!.push(m);
  }

  if (data.rounds.length === 0) {
    return (
      <GenerateLeagueForm
        data={data}
        run={run}
        pending={pending}
        error={error}
        regenerate={false}
        americano={americano}
      />
    );
  }

  return (
    <div className="space-y-5">
      <GenerateLeagueForm
        data={data}
        run={run}
        pending={pending}
        error={error}
        regenerate
        americano={americano}
      />

      {americano && (
        <p className="text-xs text-muted">
          En el americano las parejas rotan cada ronda; el ranking que vale es
          el individual.
        </p>
      )}

      {data.rounds.map((round) => {
        const matches = (matchesByRound.get(round.id) ?? []).slice().sort((a, b) => {
          const ta = a.scheduled_at ?? "";
          const tb = b.scheduled_at ?? "";
          return ta.localeCompare(tb);
        });
        return (
          <Card key={round.id}>
            <CardContent className="py-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-padel-700">
                  Jornada {round.number}
                </h3>
                <span className="text-xs text-muted">
                  {formatDate(round.scheduled_date)}
                </span>
              </div>
              {matches.length === 0 ? (
                <p className="text-sm text-muted">Sin partidos.</p>
              ) : (
                <div className="space-y-2">
                  {matches.map((m) => (
                    <LeagueMatchRow
                      key={m.id}
                      match={m}
                      eventId={e.id}
                      teamName={teamName}
                      court={
                        (m.court_id &&
                          data.courts.find((c) => c.id === m.court_id)?.name) ||
                        null
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function GenerateLeagueForm({
  data,
  run,
  pending,
  error,
  regenerate,
  americano,
}: {
  data: EventManagerData;
  run: (fn: () => Promise<{ ok: boolean; error?: string } | void>) => void;
  pending: boolean;
  error: string | null;
  regenerate: boolean;
  americano: boolean;
}) {
  const e = data.event;
  const inputCls =
    "w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm text-ink";
  const startDefault = e.start_date
    ? e.start_date.slice(0, 10)
    : "";

  const generateLabel = americano
    ? "Generar fixture (americano)"
    : "Generar liga";
  const title = regenerate ? "Regenerar fixture" : generateLabel;
  const submitLabel = regenerate ? "Regenerar fixture" : generateLabel;

  return (
    <Card>
      <CardContent className="py-5">
        <h3 className="mb-1 font-bold text-ink">{title}</h3>
        <p className="mb-4 text-xs text-muted">
          {regenerate
            ? "Atención: regenerar borra las jornadas y los resultados cargados, y vuelve a repartir el fixture."
            : americano
              ? "Genera el fixture americano (parejas rotativas) repartido en rondas con cancha y horario. Requiere jugadores inscriptos."
              : "Genera el round-robin repartido en jornadas semanales con cancha y horario. Requiere equipos creados."}
        </p>
        <form
          action={(fd) => run(() => generateFixture(e.id, fd))}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Canchas">
              <input
                name="courts"
                type="number"
                min={1}
                defaultValue={2}
                required
                className={inputCls}
              />
            </Field>
            <Field label="Fecha de inicio">
              <input
                name="start_date"
                type="date"
                defaultValue={startDefault}
                className={inputCls}
              />
            </Field>
            <Field label="Hora primer turno">
              <input
                name="first_hour"
                type="number"
                min={0}
                max={23}
                defaultValue={19}
                className={inputCls}
              />
            </Field>
            <Field label="Minutos por turno">
              <input
                name="slot_minutes"
                type="number"
                min={15}
                defaultValue={90}
                className={inputCls}
              />
            </Field>
            {americano && (
              <Field label="Rondas (opcional)">
                <input
                  name="rounds"
                  type="number"
                  min={1}
                  placeholder="Auto"
                  className={inputCls}
                />
              </Field>
            )}
          </div>
          {error && (
            <p className="text-sm font-semibold text-red-600">{error}</p>
          )}
          <Button type="submit" size="sm" disabled={pending}>
            {submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function LeagueMatchRow({
  match,
  eventId,
  teamName,
  court,
}: {
  match: Match;
  eventId: string;
  teamName: (id: string | null) => string;
  court: string | null;
}) {
  const { run, pending, error } = useAction();
  const done = match.status === "completed";

  return (
    <div className="rounded-lg border border-border-soft bg-surface px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-sm">
          <span
            className={
              match.winner_team_id === match.team_a_id
                ? "font-bold text-ink"
                : "text-muted"
            }
          >
            {teamName(match.team_a_id)}
          </span>
          <span className="px-2 text-muted">vs</span>
          <span
            className={
              match.winner_team_id === match.team_b_id
                ? "font-bold text-ink"
                : "text-muted"
            }
          >
            {teamName(match.team_b_id)}
          </span>
          <span className="ml-2 text-xs text-muted">
            {court ? `${court} · ` : ""}
            {timeOf(match.scheduled_at)}
          </span>
        </div>
        {done ? (
          <Badge tone="open">
            {match.games_a} – {match.games_b}
          </Badge>
        ) : (
          <LeagueResultForm
            eventId={eventId}
            matchId={match.id}
            run={run}
            pending={pending}
          />
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
}

function LeagueResultForm({
  eventId,
  matchId,
  run,
  pending,
}: {
  eventId: string;
  matchId: string;
  run: (fn: () => Promise<{ ok: boolean; error?: string } | void>) => void;
  pending: boolean;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        run(() => recordLeagueResult(eventId, matchId, Number(a), Number(b)));
      }}
      className="flex items-center gap-2"
    >
      <input
        type="number"
        min={0}
        required
        value={a}
        onChange={(ev) => setA(ev.target.value)}
        className="w-14 rounded-md border border-border-soft bg-surface px-2 py-1 text-sm text-ink"
        aria-label="Games equipo A"
      />
      <span className="text-muted">–</span>
      <input
        type="number"
        min={0}
        required
        value={b}
        onChange={(ev) => setB(ev.target.value)}
        className="w-14 rounded-md border border-border-soft bg-surface px-2 py-1 text-sm text-ink"
        aria-label="Games equipo B"
      />
      <Button size="sm" type="submit" disabled={pending}>
        Cargar
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Ranking individual (FASE 2)                                         */
/* ------------------------------------------------------------------ */

function RankingTab({
  data,
  league,
}: {
  data: EventManagerData;
  league: boolean;
}) {
  if (!league) {
    return (
      <EmptyState text="Disponible para torneos de liga; configurá el formato en Planificador." />
    );
  }
  if (data.playerStandings.length === 0) {
    return (
      <EmptyState text="Todavía no hay ranking. Cargá resultados en Calendario." />
    );
  }

  const playerName = (id: string) =>
    data.players.find((p) => p.id === id)?.full_name || "Jugador";

  const sorted = [...data.playerStandings].sort(
    (a, b) =>
      (a.position ?? 9999) - (b.position ?? 9999) || b.points - a.points
  );

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase text-muted">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Jugador</th>
              <th className="px-2 py-3 text-center">PJ</th>
              <th className="px-2 py-3 text-center">G</th>
              <th className="px-2 py-3 text-center">P</th>
              <th className="px-2 py-3 text-center">Pts</th>
            </tr>
          </thead>
          <tbody className="text-ink">
            {sorted.map((s, i) => (
              <tr
                key={s.id}
                className="border-b border-border-soft last:border-0"
              >
                <td className="px-4 py-3 font-semibold text-muted">
                  {s.position ?? i + 1}
                </td>
                <td className="px-4 py-3 font-semibold text-ink">
                  {playerName(s.player_id)}
                </td>
                <td className="px-2 py-3 text-center">{s.played}</td>
                <td className="px-2 py-3 text-center">{s.won}</td>
                <td className="px-2 py-3 text-center">{s.lost}</td>
                <td className="px-2 py-3 text-center font-bold text-padel-600">
                  {s.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
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

function SettingsTab({ data }: { data: EventManagerData }) {
  const { run, pending, error } = useAction();
  const e = data.event;
  const [categorySystem, setCategorySystem] = useState<
    Enums<"category_system">
  >(e.category_system ?? "fixed");
  const [interclub, setInterclub] = useState<boolean>(e.is_interclub ?? false);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="py-5">
          <form
            action={(fd) => run(() => updateEventSettings(e.id, fd))}
            className="space-y-4"
          >
            <Field label="Nombre">
              <input
                name="name"
                defaultValue={e.name}
                required
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Estado">
                <select
                  name="status"
                  defaultValue={
                    e.status === "cancelled" ? "closed" : e.status
                  }
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                >
                  <option value="draft">Borrador</option>
                  <option value="open">Abierto</option>
                  <option value="in_progress">En progreso</option>
                  <option value="closed">Cerrado</option>
                </select>
              </Field>
              <Field label="Categoría">
                <select
                  name="category_id"
                  defaultValue={e.category_id ?? ""}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                >
                  <option value="">Sin categoría</option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cupo máximo de equipos">
                <input
                  name="max_teams"
                  type="number"
                  min={0}
                  defaultValue={e.max_teams ?? ""}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                />
              </Field>
              <Field label={`Inscripción (${e.currency})`}>
                <input
                  name="registration_fee"
                  type="number"
                  min={0}
                  step="any"
                  defaultValue={e.registration_fee}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Modalidad">
                <select
                  name="modality"
                  defaultValue={e.modality ?? ""}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                >
                  <option value="">Sin definir</option>
                  <option value="caballeros">Caballeros</option>
                  <option value="damas">Damas</option>
                  <option value="mixto">Mixto</option>
                  <option value="combinado">Combinado</option>
                </select>
              </Field>
              <Field label="Sistema de categoría">
                <select
                  name="category_system"
                  value={categorySystem}
                  onChange={(ev) =>
                    setCategorySystem(
                      ev.target.value as Enums<"category_system">
                    )
                  }
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                >
                  <option value="fixed">Fija</option>
                  <option value="suma">Suma</option>
                </select>
              </Field>
            </div>

            <Field label="Categoría">
              {categorySystem === "fixed" ? (
                <select
                  name="category_value"
                  defaultValue={e.category_value ?? "7ma"}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                >
                  <option value="1ra">1ra</option>
                  <option value="2da">2da</option>
                  <option value="3ra">3ra</option>
                  <option value="4ta">4ta</option>
                  <option value="5ta">5ta</option>
                  <option value="6ta">6ta</option>
                  <option value="7ma">7ma</option>
                  <option value="8va">8va</option>
                  <option value="9na">9na</option>
                </select>
              ) : (
                <select
                  name="category_value"
                  defaultValue={e.category_value ?? "13"}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                >
                  <option value="10">10</option>
                  <option value="12">12</option>
                  <option value="13">13</option>
                  <option value="14">14</option>
                  <option value="15">15</option>
                </select>
              )}
            </Field>

            <div className="space-y-3 rounded-lg border border-border-soft p-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input
                  name="is_interclub"
                  type="checkbox"
                  checked={interclub}
                  onChange={(ev) => setInterclub(ev.target.checked)}
                  className="h-4 w-4"
                />
                Torneo interclub
              </label>

              {interclub && (
                <Field label="Club rival">
                  <select
                    name="rival_club_id"
                    defaultValue={e.rival_club_id ?? ""}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      Elegí un club
                    </option>
                    {data.rivalClubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {interclub && (
                <p className="text-xs font-semibold">
                  Estado del desafío:{" "}
                  {e.rival_accepted ? (
                    <span className="text-green-600">
                      Aceptado por el club rival
                    </span>
                  ) : (
                    <span className="text-amber-600">
                      Pendiente de aceptación
                    </span>
                  )}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                name="public_visible"
                type="checkbox"
                defaultChecked={e.public_visible}
                className="h-4 w-4"
              />
              Visible en la app pública
            </label>

            {error && (
              <p className="text-sm font-semibold text-red-600">{error}</p>
            )}
            <Button type="submit" size="sm" disabled={pending}>
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div>
            <h3 className="font-bold text-ink">Iniciar torneo</h3>
            <p className="text-sm text-muted">
              Genera el round-robin por zona (fase de grupos) y marca el evento
              en progreso. Tarifa actual: {formatMoney(e.registration_fee, e.currency)}.
            </p>
            <p className="mt-1 text-sm text-muted">
              Proyectado a cupo lleno:{" "}
              {e.max_teams != null
                ? formatMoney(e.registration_fee * e.max_teams, e.currency)
                : "—"}{" "}
              {e.max_teams != null
                ? `(${formatMoney(e.registration_fee, e.currency)} × ${e.max_teams})`
                : ""}
            </p>
          </div>
          <StartButton eventId={e.id} disabled={e.status === "in_progress"} />
        </CardContent>
      </Card>
    </div>
  );
}

function StartButton({
  eventId,
  disabled,
}: {
  eventId: string;
  disabled: boolean;
}) {
  const { run, pending, error } = useAction();
  return (
    <div className="text-right">
      <Button
        size="sm"
        disabled={pending || disabled}
        onClick={() => run(() => startTournament(eventId))}
      >
        {disabled ? "En progreso" : "Iniciar torneo"}
      </Button>
      {error && (
        <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}
