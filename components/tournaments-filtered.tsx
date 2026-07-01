"use client";

import { useMemo, useState } from "react";
import { EventCard, type EventCardData } from "@/components/event-card";
import type { Enums } from "@/lib/database.types";

export type TournamentItem = EventCardData & {
  clubId: string | null;
  clubName: string | null;
};

type StatusFilter = "all" | "open" | "in_progress" | "closed";
type ModalityFilter = "all" | Enums<"tournament_modality">;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Abierto" },
  { value: "in_progress", label: "En progreso" },
  { value: "closed", label: "Cerrado" },
];

const MODALITY_OPTIONS: { value: ModalityFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "caballeros", label: "Caballeros" },
  { value: "damas", label: "Damas" },
  { value: "mixto", label: "Mixto" },
  { value: "combinado", label: "Combinado" },
];

const selectClass =
  "rounded-xl border border-border-soft bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent";

export function TournamentsFiltered({
  tournaments,
}: {
  tournaments: TournamentItem[];
}) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [modality, setModality] = useState<ModalityFilter>("all");
  const [clubId, setClubId] = useState<string>("all");

  const clubs = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tournaments) {
      if (t.clubId && t.clubName) map.set(t.clubId, t.clubName);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, "es")
    );
  }, [tournaments]);

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (modality !== "all" && t.modality !== modality) return false;
      if (clubId !== "all" && t.clubId !== clubId) return false;
      return true;
    });
  }, [tournaments, status, modality, clubId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Filtrar por estado"
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por modalidad"
          className={selectClass}
          value={modality}
          onChange={(e) => setModality(e.target.value as ModalityFilter)}
        >
          {MODALITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por club"
          className={selectClass}
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
        >
          <option value="all">Todos los clubes</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center text-muted">
          No hay torneos que coincidan con los filtros.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <EventCard key={t.id} event={t} />
          ))}
        </div>
      )}
    </div>
  );
}
