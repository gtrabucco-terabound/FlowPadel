import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateRange,
  eventTypeLabel,
  categoryLabel,
  modalityLabel,
  formatModalityCategory,
  eventStatusMeta,
  formatMoney,
} from "@/lib/format";

describe("formatDate", () => {
  it("fallback si no hay fecha", () => {
    expect(formatDate(null)).toBe("Fecha a confirmar");
    expect(formatDate(undefined)).toBe("Fecha a confirmar");
  });
  it("formatea ISO en español", () => {
    expect(formatDate("2026-07-15")).toBe("15 de julio 2026");
  });
});

describe("formatDateRange", () => {
  it("una sola fecha si start === end", () => {
    expect(formatDateRange("2026-07-15", "2026-07-15")).toBe("15 de julio 2026");
  });
  it("rango si difieren", () => {
    expect(formatDateRange("2026-07-15", "2026-07-20")).toBe(
      "15 jul – 20 de julio 2026"
    );
  });
});

describe("labels de dominio", () => {
  it("eventTypeLabel", () => {
    expect(eventTypeLabel("tournament")).toBe("Torneo");
    expect(eventTypeLabel("open_play" as never)).toBe("Cancha abierta");
  });
  it("categoryLabel fixed vs suma", () => {
    expect(categoryLabel("fixed", "4ta")).toBe("4ta");
    expect(categoryLabel("suma", "13")).toBe("Suma 13");
    expect(categoryLabel(null, "x")).toBeNull();
  });
  it("modalityLabel", () => {
    expect(modalityLabel("mixto")).toBe("Mixto");
    expect(modalityLabel(null)).toBeNull();
  });
  it("formatModalityCategory combina", () => {
    expect(
      formatModalityCategory({
        modality: "caballeros",
        category_system: "fixed",
        category_value: "4ta",
      })
    ).toBe("Caballeros · 4ta");
  });
  it("eventStatusMeta conocido y desconocido", () => {
    expect(eventStatusMeta("open").tone).toBe("open");
    expect(eventStatusMeta("zzz" as never).tone).toBe("neutral");
  });
});

describe("formatMoney", () => {
  it("agrupa miles en ARS", () => {
    const s = formatMoney(60000);
    expect(s).toContain("60.000");
    expect(s).toContain("$");
  });
});
