import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Enums } from "@/lib/database.types";

/** Format an ISO date string into a readable Spanish date. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Fecha a confirmar";
  try {
    return format(parseISO(iso), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return "Fecha a confirmar";
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Fecha a confirmar";
  try {
    return format(parseISO(iso), "d MMM yyyy · HH:mm", { locale: es });
  } catch {
    return "Fecha a confirmar";
  }
}

export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  if (!start) return "Fecha a confirmar";
  if (!end || end === start) return formatDate(start);
  try {
    return `${format(parseISO(start), "d MMM", { locale: es })} – ${formatDate(
      end
    )}`;
  } catch {
    return formatDate(start);
  }
}

type BadgeTone = "open" | "live" | "closed" | "neutral" | "draft";

export interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

const EVENT_STATUS_META: Record<Enums<"event_status">, StatusMeta> = {
  draft: { label: "Borrador", tone: "draft" },
  open: { label: "Abierto", tone: "open" },
  in_progress: { label: "En vivo", tone: "live" },
  closed: { label: "Cerrado", tone: "closed" },
  cancelled: { label: "Cancelado", tone: "neutral" },
};

export function eventStatusMeta(status: Enums<"event_status">): StatusMeta {
  return EVENT_STATUS_META[status] ?? { label: status, tone: "neutral" };
}

export function eventTypeLabel(type: Enums<"event_type">): string {
  return type === "tournament" ? "Torneo" : "Cancha abierta";
}

const PHASE_LABELS: Record<Enums<"match_phase">, string> = {
  open_play: "Cancha abierta",
  group_stage: "Fase de grupos",
  round_of_16: "Octavos",
  quarter_final: "Cuartos",
  semi_final: "Semifinal",
  third_place: "Tercer puesto",
  final: "Final",
};

export function matchPhaseLabel(phase: Enums<"match_phase">): string {
  return PHASE_LABELS[phase] ?? phase;
}

const REGISTRATION_STATUS_LABELS: Record<
  Enums<"registration_status">,
  string
> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  waitlist: "Lista de espera",
  cancelled: "Cancelada",
};

export function registrationStatusLabel(
  status: Enums<"registration_status">
): string {
  return REGISTRATION_STATUS_LABELS[status] ?? status;
}

const MODALITY_LABELS: Record<Enums<"tournament_modality">, string> = {
  caballeros: "Caballeros",
  damas: "Damas",
  mixto: "Mixto",
  combinado: "Combinado",
};

export function modalityLabel(
  modality: Enums<"tournament_modality"> | null | undefined
): string | null {
  if (!modality) return null;
  return MODALITY_LABELS[modality] ?? modality;
}

const GENDER_LABELS: Record<Enums<"gender">, string> = {
  male: "Hombre",
  female: "Mujer",
};

export function genderLabel(
  gender: Enums<"gender"> | null | undefined
): string | null {
  if (!gender) return null;
  return GENDER_LABELS[gender] ?? gender;
}

/** Etiqueta de categoría: fixed → valor literal ("4ta"); suma → "Suma 13". */
export function categoryLabel(
  system: Enums<"category_system"> | null | undefined,
  value: string | null | undefined
): string | null {
  if (!system) return null;
  if (system === "fixed") return value?.trim() ? value.trim() : null;
  if (system === "suma") return value?.trim() ? `Suma ${value.trim()}` : "Suma";
  return null;
}

/**
 * Badge "Modalidad · Categoría" para un evento, ej. "Mixto · Suma 13",
 * "Caballeros · 4ta". Devuelve null si no hay modalidad ni categoría.
 */
export function formatModalityCategory(event: {
  modality: Enums<"tournament_modality"> | null;
  category_system: Enums<"category_system"> | null;
  category_value: string | null;
}): string | null {
  const mod = modalityLabel(event.modality);
  const cat = categoryLabel(event.category_system, event.category_value);
  if (mod && cat) return `${mod} · ${cat}`;
  return mod ?? cat ?? null;
}

export function formatMoney(amount: number, currency = "ARS"): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
