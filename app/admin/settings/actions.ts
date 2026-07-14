"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireClubAccess } from "@/lib/admin/club";

type ActionResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

const nameSchema = z.object({ name: z.string().min(1, "Ingresá un nombre").max(80) });

function refresh() {
  revalidatePath("/admin/settings");
}

/* ---- Datos del club ---- */

const txt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

/** Actualiza los datos del club activo (solo admin del club / superadmin, vía RLS). */
export async function updateClub(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return fail("Ingresá el nombre del club.");
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("clubs")
    .update({
      name,
      city: txt(formData.get("city")),
      address: txt(formData.get("address")),
      phone: txt(formData.get("phone")),
      contact_email: txt(formData.get("contact_email")),
      description: txt(formData.get("description")),
      instagram: txt(formData.get("instagram")),
      website: txt(formData.get("website")),
      logo_url: txt(formData.get("logo_url")),
    })
    .eq("id", clubId);
  if (error) return fail("No pudimos guardar los datos del club.");
  refresh();
  return { ok: true };
}

/* ---- Mercado Pago (config de cobro del club) ---- */

/** Guarda el Access Token de MP del club. Si el campo va vacío, no lo pisa. */
export async function updateClubPayments(formData: FormData): Promise<ActionResult> {
  const token = String(formData.get("mp_access_token") ?? "").trim();
  const publicKey = String(formData.get("mp_public_key") ?? "").trim();
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();

  // Upsert; sólo actualiza el token si vino algo (para no borrarlo sin querer).
  const payload: {
    club_id: string;
    mp_access_token?: string;
    mp_public_key?: string | null;
    updated_at: string;
  } = { club_id: clubId, updated_at: new Date().toISOString() };
  if (token) payload.mp_access_token = token;
  if (publicKey || formData.has("mp_public_key")) payload.mp_public_key = publicKey || null;

  const { error } = await supabase
    .from("club_payment_settings")
    .upsert(payload, { onConflict: "club_id" });
  if (error) return fail("No pudimos guardar la configuración de pagos.");
  refresh();
  return { ok: true };
}

/** Define cuánto se cobra online al reservar una cancha (seña o total). */
export async function updateBookingCharge(formData: FormData): Promise<ActionResult> {
  const type = String(formData.get("booking_charge_type") ?? "full");
  if (!["full", "percent", "fixed"].includes(type))
    return fail("Tipo de cobro inválido.");
  const value = numOrNull(formData.get("booking_charge_value"));
  if (type === "percent" && (value == null || value <= 0 || value > 100))
    return fail("Ingresá un porcentaje entre 1 y 100.");
  if (type === "fixed" && (value == null || value <= 0))
    return fail("Ingresá un monto de seña válido.");

  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("club_payment_settings")
    .upsert(
      {
        club_id: clubId,
        booking_charge_type: type as "full" | "percent" | "fixed",
        booking_charge_value: type === "full" ? null : value,
        booking_pay_at_club: formData.get("booking_pay_at_club") === "on",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "club_id" }
    );
  if (error) return fail("No pudimos guardar la política de cobro.");
  refresh();
  return { ok: true };
}

/** Configura el motor de ocupación (publicación de turnos libres + ofertas). */
export async function updateOccupancy(formData: FormData): Promise<ActionResult> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const discount = numOrNull(formData.get("discount_pct"));
  const lead = numOrNull(formData.get("lead_minutes"));
  const segDiscount = numOrNull(formData.get("segment_discount_pct"));
  const segMin = numOrNull(formData.get("segment_min_matches"));
  const segInactive = numOrNull(formData.get("segment_inactive_days"));
  const segMax = numOrNull(formData.get("segment_max_per_run"));
  const { error } = await supabase.from("club_occupancy").upsert(
    {
      club_id: clubId,
      enabled: formData.get("enabled") === "on",
      wa_target: txt(formData.get("wa_target")),
      discount_pct: discount != null && discount >= 0 && discount <= 90 ? discount : 30,
      lead_minutes: lead != null && lead > 0 ? lead : 120,
      segment_enabled: formData.get("segment_enabled") === "on",
      segment_discount_pct:
        segDiscount != null && segDiscount >= 0 && segDiscount <= 90 ? segDiscount : 20,
      segment_min_matches: segMin != null && segMin >= 0 ? segMin : 3,
      segment_inactive_days: segInactive != null && segInactive > 0 ? segInactive : 21,
      segment_max_per_run:
        segMax != null && segMax > 0 && segMax <= 200 ? segMax : 15,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "club_id" }
  );
  if (error) return fail("No pudimos guardar el motor de ocupación.");
  refresh();
  return { ok: true };
}

/** Desconecta MP (borra el token). */
export async function disconnectClubPayments(): Promise<ActionResult> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("club_payment_settings")
    .update({ mp_access_token: null, mp_public_key: null, updated_at: new Date().toISOString() })
    .eq("club_id", clubId);
  if (error) return fail("No pudimos desconectar.");
  refresh();
  return { ok: true };
}

/* ---- Courts ---- */

export async function createCourt(formData: FormData): Promise<ActionResult> {
  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Inválido");
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  // Número auto-asignado: el más alto del club + 1.
  const { data: last } = await supabase
    .from("courts")
    .select("number")
    .eq("club_id", clubId)
    .order("number", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const nextNumber = (last?.number ?? 0) + 1;
  const { error } = await supabase
    .from("courts")
    .insert({ club_id: clubId, name: parsed.data.name.trim(), number: nextNumber });
  if (error) return fail("No pudimos crear la cancha.");
  refresh();
  return { ok: true };
}

export async function renameCourt(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Inválido");
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("courts")
    .update({ name: parsed.data.name.trim() })
    .eq("id", id)
    .eq("club_id", clubId);
  if (error) return fail("No pudimos actualizar la cancha.");
  refresh();
  return { ok: true };
}

export async function toggleCourtActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("courts")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("club_id", clubId);
  if (error) return fail("No pudimos actualizar la cancha.");
  refresh();
  return { ok: true };
}

const numOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** Guarda la configuración completa de una cancha. */
export async function updateCourtConfig(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1) return fail("Ingresá un nombre de cancha.");

  const enclosure = String(formData.get("enclosure_type") ?? "");
  const surface = String(formData.get("surface") ?? "");
  const openHour = numOrNull(formData.get("open_hour"));
  const closeHour = numOrNull(formData.get("close_hour"));
  const days = formData
    .getAll("days")
    .map((d) => Number(d))
    .filter((n) => n >= 1 && n <= 7);

  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("courts")
    .update({
      name,
      // El número es automático: no se edita a mano (evita duplicados).
      enclosure_type: enclosure === "" ? null : (enclosure as "blindex" | "muro" | "mixta"),
      surface: surface === "" ? null : (surface as "cesped_sintetico" | "cemento" | "otro"),
      covered: formData.get("covered") === "on",
      lighting: formData.get("lighting") === "on",
      panoramic: formData.get("panoramic") === "on",
      price_per_slot: numOrNull(formData.get("price_per_slot")),
      slot_minutes: numOrNull(formData.get("slot_minutes")) ?? 90,
      operating_days: days.length > 0 ? days : [1, 2, 3, 4, 5, 6, 7],
      open_hour: openHour ?? 8,
      close_hour: closeHour ?? 24,
    })
    .eq("id", id)
    .eq("club_id", clubId);
  if (error) return fail("No pudimos guardar la cancha.");
  refresh();
  return { ok: true };
}
