"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClubAccess } from "@/lib/admin/club";
import {
  findPlayerByPhone,
  insertFixedBooking,
  getClubAndCourtNames,
  requestFixedCharge,
  deactivateFixed,
  cancelFutureOccurrences,
} from "@/modules/reservations/fixed-repository";
import {
  insertNotification,
  sendTransactionalEmail,
} from "@/modules/notifications/repository";

type Result = { ok: true } | { ok: false; error: string };
type LinkResult =
  | { ok: true; checkoutUrl?: string; alreadyPaid?: boolean }
  | { ok: false; error: string };

const DOW = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Aviso "turno fijo asignado": in-app (si es jugador) + email (si hay dirección). */
async function notifyFixedAssigned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  a: {
    clubId: string;
    courtId: string;
    weekday: number;
    startMin: number;
    name: string;
    monthly: number;
    playerId: string | null;
    email: string | null;
  }
) {
  const { clubName, courtName } = await getClubAndCourtNames(
    supabase,
    a.clubId,
    a.courtId
  );
  const when = `${DOW[a.weekday]} ${hhmm(a.startMin)}`;
  const bodyText = `Tenés un turno fijo asignado en ${clubName}: ${courtName}, todos los ${when}. Valor $${a.monthly}/mes.`;

  if (a.playerId) {
    await insertNotification(supabase, {
      player_id: a.playerId,
      type: "booking",
      title: "Turno fijo asignado",
      body: bodyText,
      url: null,
    });
  }
  if (a.email) {
    // fire-and-forget: no bloquea la creación si el mail falla.
    await sendTransactionalEmail(supabase, {
      to: a.email,
      subject: `Tu turno fijo en ${clubName}`,
      heading: "Tenés tu turno fijo asignado",
      body: `Hola ${a.name}, ${clubName} te asignó un turno fijo: <b style="color:#F3F6F2">${courtName}, todos los ${when}</b>. Valor $${a.monthly} por mes. Te vamos a enviar el link de pago cada mes.`,
    });
  }
}

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  const n = Number(s);
  return s !== "" && Number.isFinite(n) ? n : null;
};

/** Crea un turno fijo mensual y genera el cobro del mes en curso. */
export async function createFixedBooking(formData: FormData): Promise<LinkResult> {
  const courtId = String(formData.get("court_id") ?? "");
  const weekday = num(formData.get("weekday"));
  const startMin = num(formData.get("start_minutes"));
  const slotMin = num(formData.get("slot_minutes")) ?? 90;
  const name = String(formData.get("customer_name") ?? "").trim();
  const phone = String(formData.get("customer_phone") ?? "").trim();
  const email = String(formData.get("customer_email") ?? "").trim();
  const monthly = num(formData.get("monthly_price"));

  if (!courtId || weekday == null || startMin == null)
    return { ok: false, error: "Completá cancha, día y horario." };
  if (name.length < 2) return { ok: false, error: "Ingresá el nombre del cliente." };
  if (!monthly || monthly <= 0)
    return { ok: false, error: "Ingresá el precio mensual." };

  const { clubId } = await requireClubAccess();
  const supabase = await createClient();

  // Vínculo con el perfil: el que vino del buscador, o dedupe global por teléfono.
  let playerId = String(formData.get("player_id") ?? "").trim() || null;
  let playerEmail: string | null = null;
  if (!playerId && phone) {
    const found = await findPlayerByPhone(supabase, phone);
    if (found) {
      playerId = found.id;
      playerEmail = found.email;
    }
  }

  const fixedId = await insertFixedBooking(supabase, {
    club_id: clubId,
    court_id: courtId,
    weekday,
    start_minutes: startMin,
    slot_minutes: slotMin,
    customer_name: name,
    customer_phone: phone || null,
    customer_email: email || null,
    player_id: playerId,
    monthly_price: monthly,
  });
  if (!fixedId) return { ok: false, error: "No pudimos crear el turno fijo." };

  // Aviso multicanal de "turno asignado" (WhatsApp llegará con Evolution).
  await notifyFixedAssigned(supabase, {
    clubId,
    courtId,
    weekday,
    startMin,
    name,
    monthly,
    playerId,
    email: email || playerEmail,
  });

  const { res, error: fnErr } = await requestFixedCharge(supabase, fixedId);
  revalidatePath("/admin/turnos-fijos");
  revalidatePath("/admin/agenda");
  // Turno creado. Si falló el link (p. ej. falta conectar MP), igual ok:
  // el club puede generarlo después con el botón "Generar cobro".
  if (fnErr || !res?.ok) return { ok: true };
  return { ok: true, checkoutUrl: res.checkout_url, alreadyPaid: res.already_paid };
}

/** Regenera / obtiene el link de cobro de un periodo (por defecto, mes actual). */
export async function generateFixedCharge(
  fixedBookingId: string,
  period?: string
): Promise<LinkResult> {
  await requireClubAccess();
  const supabase = await createClient();
  const { res, error } = await requestFixedCharge(
    supabase,
    fixedBookingId,
    period
  );
  revalidatePath("/admin/turnos-fijos");
  revalidatePath("/admin/agenda");
  if (error || !res?.ok)
    return {
      ok: false,
      error:
        res?.error ??
        "No pudimos generar el cobro. Verificá que el club tenga Mercado Pago conectado.",
    };
  return { ok: true, checkoutUrl: res.checkout_url, alreadyPaid: res.already_paid };
}

/** Baja un turno fijo y libera sus turnos futuros no pagados. */
export async function deactivateFixedBooking(id: string): Promise<Result> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  await deactivateFixed(supabase, id, clubId);
  // Libera las ocurrencias futuras (las pasadas quedan como historial).
  await cancelFutureOccurrences(supabase, id, today);
  revalidatePath("/admin/turnos-fijos");
  revalidatePath("/admin/agenda");
  return { ok: true };
}
