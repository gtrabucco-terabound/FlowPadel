/**
 * Lógica central de turnos de una cancha.
 *
 * Una cancha puede tener FRANJAS (court_slot_bands) con distinta duración de
 * turno según la hora (ej. 08–16 turnos de 1h para clases, 16–23 de 1.5h para
 * alquiler). Si no tiene franjas, se usa el comportamiento legacy: un único
 * tamaño de turno (slot_minutes) entre open_hour y close_hour.
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
};

export type SlottableCourt = {
  open_hour: number;
  close_hour: number;
  slot_minutes: number;
  price_per_slot: number | null;
  bands?: CourtBand[] | null;
};

/** Franjas efectivas de la cancha (las configuradas, o una única legacy). */
export function effectiveBands(court: SlottableCourt): CourtBand[] {
  if (court.bands && court.bands.length > 0) {
    return [...court.bands].sort((a, b) => a.start_minutes - b.start_minutes);
  }
  return [
    {
      start_minutes: court.open_hour * 60,
      end_minutes: court.close_hour * 60,
      slot_minutes: court.slot_minutes || 90,
      price: court.price_per_slot,
    },
  ];
}

/** Todos los turnos de la cancha, en orden, con su duración y precio. */
export function courtSlots(court: SlottableCourt): CourtSlot[] {
  const out: CourtSlot[] = [];
  for (const b of effectiveBands(court)) {
    const step = b.slot_minutes || 90;
    for (let m = b.start_minutes; m + step <= b.end_minutes; m += step) {
      out.push({
        start_minutes: m,
        slot_minutes: step,
        price: b.price ?? court.price_per_slot ?? null,
      });
    }
  }
  return out;
}

/** Turno que arranca exactamente en `min` (para leer duración/precio del slot). */
export function slotAt(court: SlottableCourt, min: number): CourtSlot | null {
  return courtSlots(court).find((s) => s.start_minutes === min) ?? null;
}
