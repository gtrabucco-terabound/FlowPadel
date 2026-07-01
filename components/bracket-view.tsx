"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Enums, Tables } from "@/lib/database.types";

type Match = Tables<"matches">;
type Phase = Enums<"match_phase">;

/** Fases de eliminación (excluye open_play / group_stage). */
const BRACKET_PHASES: ReadonlyArray<Phase> = [
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
];

const PHASE_LABEL: Record<Phase, string> = {
  open_play: "Juego libre",
  group_stage: "Fase de grupos",
  round_of_16: "Octavos",
  quarter_final: "Cuartos",
  semi_final: "Semifinal",
  third_place: "3er puesto",
  final: "Final",
};

export function isBracketMatch(m: Match): boolean {
  return BRACKET_PHASES.includes(m.phase) && m.bracket_id != null;
}

/** Orden de columnas: por fase canónica; el 3er puesto se ubica junto a la final. */
const PHASE_ORDER: Record<Phase, number> = {
  open_play: 0,
  group_stage: 0,
  round_of_16: 1,
  quarter_final: 2,
  semi_final: 3,
  third_place: 4,
  final: 5,
};

/**
 * Visualización del cuadro de eliminación. Agrupa los matches por fase, los
 * renderiza como columnas (izq → der) y resalta al ganador. El resolver de
 * nombres (id → nombre) admite null → "A definir".
 */
export function BracketView({
  matches,
  teamName,
}: {
  matches: Match[];
  teamName: (id: string | null) => string;
}) {
  const columns = useMemo(() => {
    const bracket = matches.filter(isBracketMatch);
    const byPhase = new Map<Phase, Match[]>();
    for (const m of bracket) {
      if (!byPhase.has(m.phase)) byPhase.set(m.phase, []);
      byPhase.get(m.phase)!.push(m);
    }
    return Array.from(byPhase.entries())
      .map(([phase, ms]) => ({
        phase,
        matches: ms
          .slice()
          .sort(
            (a, b) =>
              (a.bracket_round ?? 0) - (b.bracket_round ?? 0) ||
              (a.bracket_slot ?? 0) - (b.bracket_slot ?? 0)
          ),
      }))
      .sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]);
  }, [matches]);

  if (columns.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center text-muted">
        El cuadro se genera al cerrar la fase de grupos.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-stretch gap-4">
        {columns.map((col) => (
          <div key={col.phase} className="flex w-56 shrink-0 flex-col gap-3">
            <h3 className="fp-microlabel text-padel-600">
              {PHASE_LABEL[col.phase]}
            </h3>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {col.matches.map((m) => (
                <BracketMatchCard key={m.id} match={m} teamName={teamName} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketMatchCard({
  match,
  teamName,
}: {
  match: Match;
  teamName: (id: string | null) => string;
}) {
  const aWins = match.winner_team_id != null && match.winner_team_id === match.team_a_id;
  const bWins = match.winner_team_id != null && match.winner_team_id === match.team_b_id;
  return (
    <Card>
      <CardContent className="space-y-1 px-3 py-2">
        <BracketSide
          name={teamName(match.team_a_id)}
          games={match.games_a}
          winner={aWins}
        />
        <div className="h-px bg-border-soft" />
        <BracketSide
          name={teamName(match.team_b_id)}
          games={match.games_b}
          winner={bWins}
        />
      </CardContent>
    </Card>
  );
}

function BracketSide({
  name,
  games,
  winner,
}: {
  name: string;
  games: number | null;
  winner: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={`truncate text-sm ${
          winner ? "font-bold text-padel-600" : "text-muted"
        }`}
      >
        {name}
      </span>
      <span
        className={`text-sm tabular-nums ${
          winner ? "font-bold text-padel-600" : "font-semibold text-muted"
        }`}
      >
        {games ?? "–"}
      </span>
    </div>
  );
}

export { BRACKET_PHASES };
