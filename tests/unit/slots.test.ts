import { describe, it, expect } from "vitest";
import { daySlots, rentalSlots, trainingSlots, mergeIntervals } from "@/modules/reservations/slots";

// Cancha: alquiler 8–24 en turnos de 90', $60000; franja de entrenamiento 8–16 · 60' · $25000.
const court = {
  open_hour: 8,
  close_hour: 24,
  slot_minutes: 90,
  price_per_slot: 60000,
  bands: [{ start_minutes: 8 * 60, end_minutes: 16 * 60, slot_minutes: 60, price: 25000 }],
};

describe("mergeIntervals", () => {
  it("une intervalos que se solapan o tocan", () => {
    expect(mergeIntervals([{ start: 0, end: 60 }, { start: 60, end: 120 }])).toEqual([
      { start: 0, end: 120 },
    ]);
  });
});

describe("rentalSlots", () => {
  it("ignora franjas: turnos de 90' de punta a punta", () => {
    const slots = rentalSlots(court);
    expect(slots.every((s) => s.slot_minutes === 90)).toBe(true);
    expect(slots[0]).toMatchObject({ start_minutes: 480, slot_minutes: 90, price: 60000 });
  });
});

describe("trainingSlots", () => {
  it("turnos de 1h dentro de la franja (para el selector de clases)", () => {
    const slots = trainingSlots(court);
    expect(slots).toHaveLength(8); // 8..16 => 8 turnos de 1h
    expect(slots[0]).toMatchObject({ start_minutes: 480, slot_minutes: 60, training: true });
  });
});

describe("daySlots (grilla de agenda coach-driven)", () => {
  it("sin profes: todo alquiler 90'", () => {
    const slots = daySlots(court, []);
    expect(slots.every((s) => s.slot_minutes === 90)).toBe(true);
  });

  it("profe 8–13: 1h de 8 a 13, luego alquiler 90'", () => {
    const slots = daySlots(court, [{ start: 8 * 60, end: 13 * 60 }]);
    const classSlots = slots.filter((s) => s.training);
    // 8,9,10,11,12 => 5 turnos de 1h
    expect(classSlots.map((s) => s.start_minutes)).toEqual([480, 540, 600, 660, 720]);
    expect(classSlots.every((s) => s.slot_minutes === 60 && s.price === 25000)).toBe(true);
    // el alquiler retoma a las 13:00 con turnos de 90'
    const rentalAfter = slots.filter((s) => !s.training && s.start_minutes >= 13 * 60);
    expect(rentalAfter[0]).toMatchObject({ start_minutes: 780, slot_minutes: 90 });
    // no hay solapamientos: cada turno arranca donde termina el anterior o después
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].start_minutes).toBeGreaterThanOrEqual(
        slots[i - 1].start_minutes + slots[i - 1].slot_minutes
      );
    }
  });

  it("la franja recorta al horario del profe (profe 10–12 → solo 10 y 11 son clase)", () => {
    const slots = daySlots(court, [{ start: 10 * 60, end: 12 * 60 }]);
    const classSlots = slots.filter((s) => s.training).map((s) => s.start_minutes);
    expect(classSlots).toEqual([600, 660]);
  });
});
