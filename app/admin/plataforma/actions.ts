"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import {
  createPlan,
  updatePlan,
  setPlanActive,
  deletePlan,
  updatePlatformSettings,
  type PlanInput,
  type RoiMetric,
} from "@/modules/plans/repository";

type Result = { ok: true } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

/** Solo superadmin puede administrar la plataforma. */
async function requireSuperadmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const ctx = await getAdminContext();
  if (!ctx.superadmin) return fail("Solo el superadmin puede hacer esto.");
  return { ok: true };
}

const num = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const txt = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};
const on = (fd: FormData, k: string) => fd.get(k) === "on";

function planFromForm(formData: FormData): PlanInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: txt(formData.get("description")),
    badge: txt(formData.get("badge")),
    price_amount: num(formData.get("price_amount")),
    currency: String(formData.get("currency") ?? "ARS").trim() || "ARS",
    period: String(formData.get("period") ?? "mes").trim() || "mes",
    f_reservations: on(formData, "f_reservations"),
    f_fixed_bookings: on(formData, "f_fixed_bookings"),
    f_tournaments: on(formData, "f_tournaments"),
    f_payments_mp: on(formData, "f_payments_mp"),
    f_occupancy: on(formData, "f_occupancy"),
    f_whatsapp_bot: on(formData, "f_whatsapp_bot"),
    f_lessons: on(formData, "f_lessons"),
    community_scope:
      String(formData.get("community_scope") ?? "club") === "platform"
        ? "platform"
        : "club",
    founder_eligible: on(formData, "founder_eligible"),
    is_active: on(formData, "is_active"),
    sort_order: num(formData.get("sort_order")) ?? 0,
  };
}

/** Crea o actualiza un plan (según venga `id`). */
export async function savePlan(formData: FormData): Promise<Result> {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard;
  const input = planFromForm(formData);
  if (input.name.length < 2) return fail("Ingresá el nombre del plan.");

  const supabase = await createClient();
  const id = txt(formData.get("id"));
  const { error } = id
    ? await updatePlan(supabase, id, input)
    : await createPlan(supabase, input);
  if (error) return fail("No pudimos guardar el plan.");
  revalidatePath("/admin/plataforma");
  revalidatePath("/");
  return { ok: true };
}

export async function togglePlan(id: string, active: boolean): Promise<Result> {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard;
  const supabase = await createClient();
  const { error } = await setPlanActive(supabase, id, active);
  if (error) return fail("No pudimos actualizar el plan.");
  revalidatePath("/admin/plataforma");
  revalidatePath("/");
  return { ok: true };
}

export async function removePlan(id: string): Promise<Result> {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard;
  const supabase = await createClient();
  const { error } = await deletePlan(supabase, id);
  if (error) return fail("No pudimos eliminar el plan.");
  revalidatePath("/admin/plataforma");
  revalidatePath("/");
  return { ok: true };
}

/** Guarda la config global: Fundador + ROI (4 métricas). */
export async function saveSettings(formData: FormData): Promise<Result> {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard;

  const roi: RoiMetric[] = [];
  for (let i = 0; i < 6; i++) {
    const value = txt(formData.get(`roi_${i}_value`));
    const label = txt(formData.get(`roi_${i}_label`));
    if (!value && !label) continue;
    roi.push({
      value: value ?? "",
      label: label ?? "",
      note: txt(formData.get(`roi_${i}_note`)) ?? "",
    });
  }

  const supabase = await createClient();
  const { error } = await updatePlatformSettings(supabase, {
    founder_discount_pct: num(formData.get("founder_discount_pct")) ?? 50,
    founder_years: num(formData.get("founder_years")) ?? 3,
    founder_slots_total: num(formData.get("founder_slots_total")) ?? 10,
    founder_slots_taken: num(formData.get("founder_slots_taken")) ?? 0,
    ref_court_hour_price: num(formData.get("ref_court_hour_price")) ?? 65000,
    roi,
  });
  if (error) return fail("No pudimos guardar la configuración.");
  revalidatePath("/admin/plataforma");
  revalidatePath("/");
  return { ok: true };
}
