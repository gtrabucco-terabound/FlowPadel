/**
 * Lógica central de turnos de una cancha.
 *
 * La cancha se vende en su turno NATURAL (slot_minutes, ej. 1.5h) para alquiler.
 * Además puede tener FRANJAS DE ENTRENAMIENTO (court_slot_bands): un rango horario
 * "acá se puede entrenar", con su duración de clase (ej. 1h) y precio.
 *
 * Una franja de entrenamiento por sí sola NO cambia la grilla: la grilla recién
 * se abre a turnos de 1h en los días y horas donde hay un profe disponible
 * (intersección franja ∩ disponibilidad del profe). Sin profes, todo queda en el
 * turno natural de alquiler.
 */

export type CourtBand = {
  start_minutes: number;
  end_minutes: number;
  slot_minutes: number;
  price: number | null;
};

export type CourtSlot = {
  start_minutes: number;
  slot_minutes: number;
  price: number | null;
  /** true si el turno es de clase (franja de entrenamiento activa). */
  training?: boolean;
};

export type SlottableCourt = {
  open_hour: number;
  close_hour: number;
  slot_minutes: number;
  price_per_slot: number | null;
  bands?: CourtBand[] | null;
};

export type Interval = { start: number; end: number };

/** Une intervalos que se solapan/tocan en una lista ordenada y disjunta. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ start: i.start, end: i.end });
  }
  return out;
}

/** Turnos de alquiler natural de la cancha (para la app pública). */
export function rentalSlots(court: SlottableCourt): CourtSlot[] {
  const out: CourtSlot[] = [];
  const step = court.slot_minutes || 90;
  const price = court.price_per_slot ?? null;
  for (let m = court.open_hour * 60; m + step <= court.close_hour * 60; m += step) {
    out.push({ start_minutes: m, slot_minutes: step, price });
  }
  return out;
}

/** Turnos de las franjas de entrenamiento (1h), sin cruzar con profes.
 *  Se usa para el selector de horario al agendar una clase en una cancha. */
export function trainingSlots(court: SlottableCourt): CourtSlot[] {
  const out: CourtSlot[] = [];
  for (const b of court.bands ?? []) {
    const step = b.slot_minutes || 60;
    for (let m = b.start_minutes; m + step <= b.end_minutes; m += step) {
      out.push({ start_minutes: m, slot_minutes: step, price: b.price ?? court.price_per_slot ?? null, training: true });
    }
  }
  return out.sort((a, b) => a.start_minutes - b.start_minutes);
}

/** Segmentos de clase de un día: franja de entrenamiento ∩ disponibilidad de
 *  profes, recortado a múltiplos enteros del turno de clase. */
function trainingSegments(
  court: SlottableCourt,
  coachIntervals: Interval[]
): { start: number; end: number; slot: number; price: number | null }[] {
  const merged = mergeIntervals(coachIntervals);
  const segs: { start: number; end: number; slot: number; price: number | null }[] = [];
  for (const b of court.bands ?? []) {
    const step = b.slot_minutes || 60;
    for (const ci of merged) {
      const s = Math.max(b.start_minutes, ci.start);
      const e = Math.min(b.end_minutes, ci.end);
      const whole = Math.floor((e - s) / step) * step;
      if (whole >= step) {
        segs.push({ start: s, end: s + whole, slot: step, price: b.price ?? court.price_per_slot ?? null });
      }
    }
  }
  return segs.sort((a, b) => a.start - b.start);
}

/**
 * Grilla del día para la agenda del club: turnos de alquiler natural,
 * superpuestos por turnos de 1h de clase donde hay un profe disponible.
 * `coachIntervals` = disponibilidad (en minutos) de los profes activos ese día.
 */
export function daySlots(court: SlottableCourt, coachIntervals: Interval[]): CourtSlot[] {
  const open = court.open_hour * 60;
  const close = court.close_hour * 60;
  const rentalStep = court.slot_minutes || 90;
  const rentalPrice = court.price_per_slot ?? null;
  const segs = trainingSegments(court, coachIntervals);

  const out: CourtSlot[] = [];
  let cursor = open;
  const pushRental = (from: number, to: number) => {
    for (let m = from; m + rentalStep <= to; m += rentalStep) {
      out.push({ start_minutes: m, slot_minutes: rentalStep, price: rentalPrice });
    }
  };

  for (const seg of segs) {
    const segStart = Math.max(seg.start, open);
    const segEnd = Math.min(seg.end, close);
    if (segEnd <= cursor) continue; // ya cubierto
    pushRental(cursor, segStart);
    for (let m = Math.max(segStart, cursor); m + seg.slot <= segEnd; m += seg.slot) {
      out.push({ start_minutes: m, slot_minutes: seg.slot, price: seg.price, training: true });
    }
    cursor = segEnd;
  }
  pushRental(cursor, close);
  return out.sort((a, b) => a.start_minutes - b.start_minutes);
}
