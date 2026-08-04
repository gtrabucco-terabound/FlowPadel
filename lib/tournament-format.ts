/** Etiquetas y orden de las fases de un torneo (para agrupar y titular partidos). */

export const PHASE_LABEL: Record<string, string> = {
  group_stage: "Zona",
  round_of_16: "Octavos",
  quarter_final: "Cuartos",
  semi_final: "Semifinal",
  third_place: "3er puesto",
  final: "Final",
  open_play: "Partidos",
};

/** Orden en que se muestran las fases (zonas primero, luego el cuadro). */
export const PHASE_ORDER: string[] = [
  "group_stage",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
  "open_play",
];

export function phaseLabel(phase: string | null | undefined): string {
  return (phase && PHASE_LABEL[phase]) || "Partidos";
}

export function phaseRank(phase: string | null | undefined): number {
  const i = phase ? PHASE_ORDER.indexOf(phase) : -1;
  return i === -1 ? PHASE_ORDER.length : i;
}

/**
 * Numeración visual de zonas: Zona 1, Zona 2, … (ordenadas por nombre).
 * El número también indica la cancha sugerida (Zona 1 → Cancha 1), es solo
 * una etiqueta para el jugador; el sistema no bloquea ni asigna la cancha.
 */
export function zoneNumbers(
  zones: { id: string; name: string | null }[]
): Map<string, number> {
  const sorted = [...zones].sort((a, b) =>
    (a.name ?? "").localeCompare(b.name ?? "", "es")
  );
  const map = new Map<string, number>();
  sorted.forEach((z, i) => map.set(z.id, i + 1));
  return map;
}

export function zoneLabel(n: number): string {
  return `Zona ${n} (Cancha ${n})`;
}
