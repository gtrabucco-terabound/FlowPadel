import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

/** Cliente Supabase server-side. */
type DB = Awaited<ReturnType<typeof createClient>>;

export type Plan = Tables<"plans">;

/** Flags de features efectivos de un club, resueltos desde su plan. */
export type ClubFeatures = {
  reservations: boolean;
  fixedBookings: boolean;
  tournaments: boolean;
  paymentsMp: boolean;
  occupancy: boolean;
  whatsappBot: boolean;
  lessons: boolean;
  communityScope: string; // 'club' | 'platform'
  planName: string | null;
};

/** Clave de feature usada para gatear navegación/páginas. */
export type FeatureKey =
  | "reservations"
  | "fixedBookings"
  | "tournaments"
  | "occupancy"
  | "whatsappBot"
  | "lessons";

// Sin plan asignado ⇒ todo habilitado. Así no rompemos clubs existentes: el
// gating recién "muerde" cuando el superadmin le asigna un plan al club.
const ALL_ON: ClubFeatures = {
  reservations: true,
  fixedBookings: true,
  tournaments: true,
  paymentsMp: true,
  occupancy: true,
  whatsappBot: true,
  lessons: true,
  communityScope: "platform",
  planName: null,
};

/** Resuelve los features efectivos del club a partir de su plan (o todo-ON). */
export async function getClubFeatures(
  supabase: DB,
  clubId: string
): Promise<ClubFeatures> {
  const { data } = await supabase
    .from("clubs")
    .select(
      "plan:plans(name, f_reservations, f_fixed_bookings, f_tournaments, f_payments_mp, f_occupancy, f_whatsapp_bot, f_lessons, community_scope)"
    )
    .eq("id", clubId)
    .maybeSingle();
  const p = (data as { plan: Tables<"plans"> | null } | null)?.plan;
  if (!p) return ALL_ON;
  return {
    reservations: p.f_reservations,
    fixedBookings: p.f_fixed_bookings,
    tournaments: p.f_tournaments,
    paymentsMp: p.f_payments_mp,
    occupancy: p.f_occupancy,
    whatsappBot: p.f_whatsapp_bot,
    lessons: p.f_lessons,
    communityScope: p.community_scope,
    planName: p.name,
  };
}

export type RoiMetric = { value: string; label: string; note: string };

export type PlatformSettings = {
  founder_discount_pct: number;
  founder_years: number;
  founder_slots_total: number;
  founder_slots_taken: number;
  ref_court_hour_price: number;
  roi: RoiMetric[];
};

/** Planes activos, ordenados (para la landing y para elegir plan de un club). */
export async function listActivePlans(supabase: DB): Promise<Plan[]> {
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Plan[];
}

/** Todos los planes (para el ABM de superadmin). */
export async function listAllPlans(supabase: DB): Promise<Plan[]> {
  const { data } = await supabase
    .from("plans")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data ?? []) as Plan[];
}

/** Config global de la plataforma (Fundador + ROI). */
export async function getPlatformSettings(
  supabase: DB
): Promise<PlatformSettings> {
  const { data } = await supabase
    .from("platform_settings")
    .select(
      "founder_discount_pct, founder_years, founder_slots_total, founder_slots_taken, ref_court_hour_price, roi"
    )
    .eq("id", 1)
    .maybeSingle();
  return {
    founder_discount_pct: data?.founder_discount_pct ?? 50,
    founder_years: data?.founder_years ?? 3,
    founder_slots_total: data?.founder_slots_total ?? 10,
    founder_slots_taken: data?.founder_slots_taken ?? 0,
    ref_court_hour_price: Number(data?.ref_court_hour_price ?? 65000),
    roi: ((data?.roi as RoiMetric[] | null) ?? []) as RoiMetric[],
  };
}

/* ---- ABM de planes (superadmin) ---- */

export type PlanInput = {
  name: string;
  description: string | null;
  badge: string | null;
  price_amount: number | null;
  currency: string;
  period: string;
  f_reservations: boolean;
  f_fixed_bookings: boolean;
  f_tournaments: boolean;
  f_payments_mp: boolean;
  f_occupancy: boolean;
  f_whatsapp_bot: boolean;
  f_lessons: boolean;
  community_scope: string;
  founder_eligible: boolean;
  is_active: boolean;
  sort_order: number;
};

/** Crea un plan. */
export async function createPlan(
  supabase: DB,
  input: PlanInput
): Promise<{ error: boolean }> {
  const { error } = await supabase.from("plans").insert(input);
  return { error: Boolean(error) };
}

/** Actualiza un plan existente. */
export async function updatePlan(
  supabase: DB,
  id: string,
  input: PlanInput
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("plans")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: Boolean(error) };
}

/** Activa/desactiva (muestra/oculta en la landing) un plan. */
export async function setPlanActive(
  supabase: DB,
  id: string,
  active: boolean
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("plans")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: Boolean(error) };
}

/** Elimina un plan. */
export async function deletePlan(
  supabase: DB,
  id: string
): Promise<{ error: boolean }> {
  const { error } = await supabase.from("plans").delete().eq("id", id);
  return { error: Boolean(error) };
}

/** Actualiza la config global (Fundador + ROI). */
export async function updatePlatformSettings(
  supabase: DB,
  patch: {
    founder_discount_pct: number;
    founder_years: number;
    founder_slots_total: number;
    founder_slots_taken: number;
    ref_court_hour_price: number;
    roi: RoiMetric[];
  }
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("platform_settings")
    .upsert(
      { id: 1, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
  return { error: Boolean(error) };
}

/** Lista legible de funciones incluidas en un plan (para las tarjetas). */
export function planFeatureLabels(plan: Plan): string[] {
  const out: string[] = [];
  if (plan.f_reservations) out.push("Reservas y agenda");
  if (plan.f_fixed_bookings) out.push("Turnos fijos");
  if (plan.f_tournaments) out.push("Torneos y ranking");
  if (plan.f_payments_mp) out.push("Cobros con Mercado Pago");
  if (plan.f_occupancy) out.push("Motor de ocupación (WhatsApp)");
  if (plan.f_whatsapp_bot) out.push("Bot de WhatsApp");
  if (plan.f_lessons) out.push("Clases y entrenamientos");
  out.push(
    plan.community_scope === "platform"
      ? "Alcance a todos los jugadores de la plataforma"
      : "Jugadores de tu club"
  );
  return out;
}
