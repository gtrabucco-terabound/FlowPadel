"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, modalityLabel } from "@/lib/format";
import { BracketView, isBracketMatch } from "@/components/bracket-view";
import type { Enums, Tables } from "@/lib/database.types";

type Match = Tables<"matches">;
type Standing = Tables<"standings">;
type Zone = Tables<"zones">;
type Team = Pick<Tables<"teams">, "id" | "name">;
type Round = Tables<"rounds">;
type PlayerStanding = Tables<"player_standings">;
type PlayerName = Pick<Tables<"players">, "id" | "full_name">;
type CourtName = Pick<Tables<"courts">, "id" | "name">;

export interface EventDetailData {
  eventId: string;
  zones: Zone[];
  matches: Match[];
  standings: Standing[];
  teams: Team[];
  hasBrackets: boolean;
  isLeague: boolean;
  isAmericano: boolean;
  /** True si el evento es combinado (varias modalidades hospedadas a la vez). */
  isCombinado: boolean;
  rounds: Round[];
  playerStandings: PlayerStanding[];
  players: PlayerName[];
  courts: CourtName[];
}

export function EventDetailTabs({ data }: { data: EventDetailData }) {
  const router = useRouter();
  const [tab, setTab] = useState(data.isLeague ? "calendar" : "matches");

  const tabs = useMemo(() => {
    if (data.isAmericano) {
      // Americano: parejas rotativas, ranking individual. Sin Posiciones de
      // equipos ni Cuadro.
      return [
        { value: "calendar", label: "Calendario" },
        { value: "ranking", label: "Ranking" },
      ];
    }
    if (data.isLeague) {
      return [
        { value: "calendar", label: "Calendario" },
        { value: "standings", label: "Posiciones" },
        { value: "ranking", label: "Ranking" },
        { value: "bracket", label: "Cuadro" },
      ];
    }
    return [
      { value: "matches", label: "Partidos" },
      { value: "standings", label: "Posiciones" },
      { value: "bracket", label: "Cuadro" },
    ];
  }, [data.isLeague, data.isAmericano]);

  // Realtime: refresh server data when matches/standings/rounds change.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event:${data.eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `event_id=eq.${data.eventId}`,
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "standings" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `event_id=eq.${data.eventId}`,
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_standings",
          filter: `event_id=eq.${data.eventId}`,
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data.eventId, router]);

  const teamName = (id: string | null) => {
    if (!id) return "A definir";
    return data.teams.find((t) => t.id === id)?.name || "Equipo";
  };

  return (
    <div className="space-y-6">
      <Tabs tabs={tabs} value={tab} onValueChange={setTab} />

      {tab === "matches" && <MatchesView data={data} teamName={teamName} />}
      {tab === "calendar" && (
        <CalendarView data={data} teamName={teamName} />
      )}
      {tab === "standings" && (
        <StandingsView data={data} teamName={teamName} />
      )}
      {tab === "ranking" && <RankingView data={data} />}
      {tab === "bracket" && (
        <BracketView
          matches={data.matches.filter(isBracketMatch)}
          teamName={teamName}
        />
      )}
    </div>
  );
}

function CalendarView({
  data,
  teamName,
}: {
  data: EventDetailData;
  teamName: (id: string | null) => string;
}) {
  if (data.rounds.length === 0) {
    return <EmptyState text="Todavía no hay calendario de jornadas." />;
  }

  const courtName = (id: string | null) =>
    (id && data.courts.find((c) => c.id === id)?.name) || null;
  const timeOf = (iso: string | null) => {
    if (!iso) return null;
    try {
      return format(parseISO(iso), "HH:mm", { locale: es });
    } catch {
      return null;
    }
  };

  const byRound = new Map<string, Match[]>();
  for (const m of data.matches) {
    if (!m.round_id) continue;
    if (!byRound.has(m.round_id)) byRound.set(m.round_id, []);
    byRound.get(m.round_id)!.push(m);
  }

  return (
    <div className="space-y-6">
      {data.rounds.map((round) => {
        const matches = (byRound.get(round.id) ?? [])
          .slice()
          .sort((a, b) =>
            (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "")
          );
        return (
          <div key={round.id}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="fp-microlabel text-padel-600">
                Jornada {round.number}
              </h3>
              <span className="text-xs text-muted">
                {formatDate(round.scheduled_date)}
              </span>
            </div>
            {matches.length === 0 ? (
              <EmptyState text="Sin partidos en esta jornada." />
            ) : (
              <div className="space-y-2">
                {matches.map((m) => {
                  const aWins = m.winner_team_id === m.team_a_id;
                  const bWins = m.winner_team_id === m.team_b_id;
                  const court = courtName(m.court_id);
                  const time = timeOf(m.scheduled_at);
                  return (
                    <Card key={m.id}>
                      <CardContent className="space-y-1 py-3">
                        <Row
                          name={teamName(m.team_a_id)}
                          games={m.games_a}
                          winner={aWins}
                        />
                        <Row
                          name={teamName(m.team_b_id)}
                          games={m.games_b}
                          winner={bWins}
                        />
                        {(court || time) && (
                          <p className="pt-1 text-xs text-muted">
                            {[court, time].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RankingView({ data }: { data: EventDetailData }) {
  if (data.playerStandings.length === 0) {
    return <EmptyState text="Todavía no hay ranking individual." />;
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
            <tr className="border-b border-black/5 text-left text-xs uppercase text-muted">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Jugador</th>
              <th className="px-2 py-3 text-center">PJ</th>
              <th className="px-2 py-3 text-center">G</th>
              <th className="px-2 py-3 text-center">P</th>
              <th className="px-2 py-3 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr key={s.id} className="border-b border-black/5 last:border-0">
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

/**
 * Filtro por modalidad para eventos combinados (Bloque M2). Deriva las
 * modalidades de las zonas y deja al espectador elegir una división.
 */
function useModalityFilter(data: EventDetailData) {
  const modalities = useMemo(() => {
    const set = new Set<Enums<"tournament_modality">>();
    for (const z of data.zones) if (z.modality) set.add(z.modality);
    return Array.from(set);
  }, [data.zones]);
  const [selected, setSelected] =
    useState<Enums<"tournament_modality"> | null>(null);
  const show = data.isCombinado && modalities.length > 0;
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
        : "border border-border-strong bg-surface text-muted"
    }`;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
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

function MatchesView({
  data,
  teamName,
}: {
  data: EventDetailData;
  teamName: (id: string | null) => string;
}) {
  const filter = useModalityFilter(data);

  if (data.matches.length === 0) {
    return <EmptyState text="Todavía no hay partidos cargados." />;
  }

  const zoneName = (id: string | null) =>
    id ? data.zones.find((z) => z.id === id)?.name ?? "Zona" : "Sin zona";
  const zoneModality = new Map(data.zones.map((z) => [z.id, z.modality]));

  const visibleMatches = filter.selected
    ? data.matches.filter(
        (m) => m.zone_id != null && zoneModality.get(m.zone_id) === filter.selected
      )
    : data.matches;

  // Group matches by zone id.
  const groups = new Map<string, Match[]>();
  for (const m of visibleMatches) {
    const key = m.zone_id ?? "__none__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  return (
    <div className="space-y-6">
      {filter.show && (
        <ModalityFilter
          modalities={filter.modalities}
          selected={filter.selected}
          onSelect={filter.setSelected}
        />
      )}
      {[...groups.entries()].map(([zoneId, matches]) => (
        <div key={zoneId}>
          <h3 className="fp-microlabel mb-2 text-padel-600">
            {zoneName(zoneId === "__none__" ? null : zoneId)}
          </h3>
          <div className="space-y-2">
            {matches.map((m) => {
              const aWins = m.winner_team_id === m.team_a_id;
              const bWins = m.winner_team_id === m.team_b_id;
              return (
                <Card key={m.id}>
                  <CardContent className="flex items-center justify-between gap-3 py-3">
                    <div className="flex-1 space-y-1">
                      <Row
                        name={teamName(m.team_a_id)}
                        games={m.games_a}
                        winner={aWins}
                      />
                      <Row
                        name={teamName(m.team_b_id)}
                        games={m.games_b}
                        winner={bWins}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Row({
  name,
  games,
  winner,
}: {
  name: string;
  games: number | null;
  winner: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          winner ? "font-bold text-ink" : "text-muted"
        }
      >
        {name}
      </span>
      <span
        className={
          winner
            ? "font-bold text-padel-600"
            : "font-semibold text-muted"
        }
      >
        {games ?? "–"}
      </span>
    </div>
  );
}

function StandingsView({
  data,
  teamName,
}: {
  data: EventDetailData;
  teamName: (id: string | null) => string;
}) {
  const filter = useModalityFilter(data);

  if (data.standings.length === 0) {
    return <EmptyState text="Todavía no hay posiciones." />;
  }

  const zoneModality = new Map(data.zones.map((z) => [z.id, z.modality]));
  const visible = filter.selected
    ? data.standings.filter(
        (s) => s.zone_id != null && zoneModality.get(s.zone_id) === filter.selected
      )
    : data.standings;

  const sorted = [...visible].sort(
    (a, b) => b.points - a.points || b.games_diff - a.games_diff
  );

  return (
    <div>
      {filter.show && (
        <ModalityFilter
          modalities={filter.modalities}
          selected={filter.selected}
          onSelect={filter.setSelected}
        />
      )}
      <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-xs uppercase text-muted">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Equipo</th>
              <th className="px-2 py-3 text-center">PJ</th>
              <th className="px-2 py-3 text-center">G</th>
              <th className="px-2 py-3 text-center">P</th>
              <th className="px-2 py-3 text-center">Dif</th>
              <th className="px-2 py-3 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr key={s.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-semibold text-muted">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-ink">
                  {teamName(s.team_id)}
                </td>
                <td className="px-2 py-3 text-center">{s.played}</td>
                <td className="px-2 py-3 text-center">{s.won}</td>
                <td className="px-2 py-3 text-center">{s.lost}</td>
                <td className="px-2 py-3 text-center">{s.games_diff}</td>
                <td className="px-2 py-3 text-center font-bold text-padel-600">
                  {s.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center text-muted">
      {text}
    </div>
  );
}
