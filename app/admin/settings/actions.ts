"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireClubAccess, getAdminContext } from "@/lib/admin/club";
import {
  getClubInstance,
  upsertClubInstance,
  setInstanceStatus,
} from "@/modules/whatsapp/repository";
import {
  ensureInstance,
  connectInstance,
  instanceState,
  evolutionConfigured,
} from "@/lib/evolution";
import {
  upsertClubPaymentTokens,
  updateBookingChargePolicy,
  disconnectClubPaymentTokens,
} from "@/modules/payments/repository";
import {
  updateClubInfo,
  getMaxCourtNumber,
  insertCourt,
  renameCourtRow,
  setCourtActive,
  updateCourtConfigRow,
  upsertClubOccupancy,
} from "@/modules/clubs/repository";
import {
  insertCourtBand,
  deleteCourtBand,
  listBandsForCourt,
} from "@/modules/reservations/repository";

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
  const { error } = await updateClubInfo(supabase, clubId, {
    name,
    city: txt(formData.get("city")),
    address: txt(formData.get("address")),
    phone: txt(formData.get("phone")),
    contact_email: txt(formData.get("contact_email")),
    description: txt(formData.get("description")),
    instagram: txt(formData.get("instagram")),
    website: txt(formData.get("website")),
    logo_url: txt(formData.get("logo_url")),
  });
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

  // Sólo actualiza el token si vino algo (para no borrarlo sin querer).
  const tokens: { mp_access_token?: string; mp_public_key?: string | null } = {};
  if (token) tokens.mp_access_token = token;
  if (publicKey || formData.has("mp_public_key"))
    tokens.mp_public_key = publicKey || null;

  const { error } = await upsertClubPaymentTokens(supabase, clubId, tokens);
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
  const { error } = await updateBookingChargePolicy(supabase, clubId, {
    booking_charge_type: type as "full" | "percent" | "fixed",
    booking_charge_value: type === "full" ? null : value,
    booking_pay_at_club: formData.get("booking_pay_at_club") === "on",
  });
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
  const { error } = await upsertClubOccupancy(supabase, clubId, {
    enabled: formData.get("enabled") === "on",
    wa_target: txt(formData.get("wa_target")),
    discount_pct: discount != null && discount >= 0 && discount <= 90 ? discount : 30,
    lead_minutes: lead != null && lead > 0 ? lead : 120,
    segment_enabled: formData.get("segment_enabled") === "on",
    segment_discount_pct:
      segDiscount != null && segDiscount >= 0 && segDiscount <= 90 ? segDiscount : 20,
    segment_min_matches: segMin != null && segMin >= 0 ? segMin : 3,
    segment_inactive_days: segInactive != null && segInactive > 0 ? segInactive : 21,
    segment_max_per_run: segMax != null && segMax > 0 && segMax <= 200 ? segMax : 15,
  });
  if (error) return fail("No pudimos guardar el motor de ocupación.");
  refresh();
  return { ok: true };
}

/** Desconecta MP (borra el token). */
export async function disconnectClubPayments(): Promise<ActionResult> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await disconnectClubPaymentTokens(supabase, clubId);
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
  const nextNumber = (await getMaxCourtNumber(supabase, clubId)) + 1;
  const { error } = await insertCourt(
    supabase,
    clubId,
    parsed.data.name.trim(),
    nextNumber
  );
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
  const { error } = await renameCourtRow(
    supabase,
    id,
    clubId,
    parsed.data.name.trim()
  );
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
  const { error } = await setCourtActive(supabase, id, clubId, isActive);
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
  const { error } = await updateCourtConfigRow(supabase, id, clubId, {
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
  });
  if (error) return fail("No pudimos guardar la cancha.");
  refresh();
  return { ok: true };
}

/* ---- Franjas de turno por cancha ---- */

/** Agrega una franja (ej. 08–16 turnos de 60'). Valida horas y solape. */
export async function createCourtBand(formData: FormData): Promise<ActionResult> {
  const courtId = String(formData.get("court_id") ?? "");
  const fromHour = numOrNull(formData.get("from_hour"));
  const toHour = numOrNull(formData.get("to_hour"));
  const slotMinutes = numOrNull(formData.get("slot_minutes"));
  const price = numOrNull(formData.get("price"));

  if (!courtId) return fail("Cancha inválida.");
  if (fromHour == null || toHour == null || fromHour < 0 || toHour > 24 || toHour <= fromHour)
    return fail("Revisá el horario de la franja (desde < hasta).");
  if (slotMinutes == null || slotMinutes < 15) return fail("Duración de turno inválida.");

  await requireClubAccess();
  const supabase = await createClient();
  const start = fromHour * 60;
  const end = toHour * 60;

  // No permitimos franjas que se pisen entre sí en la misma cancha.
  const existing = await listBandsForCourt(supabase, courtId);
  if (existing.some((b) => start < b.end_minutes && b.start_minutes < end))
    return fail("Esa franja se pisa con otra ya cargada.");

  const { error } = await insertCourtBand(supabase, {
    court_id: courtId,
    start_minutes: start,
    end_minutes: end,
    slot_minutes: slotMinutes,
    price,
  });
  if (error) return fail("No pudimos agregar la franja.");
  refresh();
  return { ok: true };
}

export async function removeCourtBand(id: string): Promise<ActionResult> {
  await requireClubAccess();
  const supabase = await createClient();
  const { error } = await deleteCourtBand(supabase, id);
  if (error) return fail("No pudimos borrar la franja.");
  refresh();
  return { ok: true };
}

/* ---- Línea privada de WhatsApp (tier Marca propia) ---- */

type QrResult =
  | { ok: true; qr: string | null }
  | { ok: false; error: string };

/** Crea/asegura la instancia del club en Evolution y devuelve el QR (base64). */
export async function connectClubWhatsapp(): Promise<QrResult> {
  const ctx = await getAdminContext();
  if (ctx.activeMembership.role !== "club_admin" && !ctx.superadmin)
    return { ok: false, error: "Solo el admin del club puede conectar WhatsApp." };
  if (!ctx.features.privateLine)
    return { ok: false, error: "Tu plan no incluye la línea privada de WhatsApp." };
  if (!evolutionConfigured())
    return { ok: false, error: "WhatsApp no está configurado en el servidor." };

  const supabase = await createClient();
  const name = `club-${ctx.activeMembership.club.slug}`;
  await upsertClubInstance(supabase, ctx.activeClubId, name);

  const ens = await ensureInstance(name);
  if (!ens.ok) return { ok: false, error: ens.error };
  const qr = await connectInstance(name);
  if (!qr.ok) return { ok: false, error: qr.error };

  await setInstanceStatus(supabase, ctx.activeClubId, "connecting", null);
  refresh();
  return { ok: true, qr: qr.data.base64 };
}

type StatusResult =
  | { ok: true; status: string; phone: string | null }
  | { ok: false; error: string };

/** Consulta el estado real de la instancia en Evolution y lo persiste. */
export async function refreshClubWhatsapp(): Promise<StatusResult> {
  const ctx = await getAdminContext();
  if (ctx.activeMembership.role !== "club_admin" && !ctx.superadmin)
    return { ok: false, error: "Solo el admin del club puede ver el estado." };

  const supabase = await createClient();
  const inst = await getClubInstance(supabase, ctx.activeClubId);
  if (!inst) return { ok: false, error: "Todavía no generaste el QR." };

  const st = await instanceState(inst.instance_name);
  if (!st.ok) return { ok: false, error: st.error };

  await setInstanceStatus(supabase, ctx.activeClubId, st.data.status, st.data.phone);
  refresh();
  return { ok: true, status: st.data.status, phone: st.data.phone };
}
