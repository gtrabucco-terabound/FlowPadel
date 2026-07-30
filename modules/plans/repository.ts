import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

/** Cliente Supabase server-side. */
type DB = Awaited<ReturnType<typeof createClient>>;

export type Plan = Tables<"plans">;

export type RoiMetric = { value: string; label: string; note: string };

export type PlatformSettings = {
  founder_discount_pct: number;
  founder_years: number;
  founder_slots_total: number;
  founder_slots_taken: number;
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
      "founder_discount_pct, founder_years, founder_slots_total, founder_slots_taken, roi"
    )
    .eq("id", 1)
    .maybeSingle();
  return {
    founder_discount_pct: data?.founder_discount_pct ?? 50,
    founder_years: data?.founder_years ?? 3,
    founder_slots_total: data?.founder_slots_total ?? 10,
    founder_slots_taken: data?.founder_slots_taken ?? 0,
    roi: ((data?.roi as RoiMetric[] | null) ?? []) as RoiMetric[],
  };
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
  out.push(
    plan.community_scope === "platform"
      ? "Alcance a todos los jugadores de la plataforma"
      : "Jugadores de tu club"
  );
  return out;
}
