"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClubAccess } from "@/lib/admin/club";

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
  const [{ data: club }, { data: court }] = await Promise.all([
    supabase.from("clubs").select("name").eq("id", a.clubId).maybeSingle(),
    supabase.from("courts").select("name").eq("id", a.courtId).maybeSingle(),
  ]);
  const clubName = club?.name ?? "el club";
  const courtName = court?.name ?? "la cancha";
  const when = `${DOW[a.weekday]} ${hhmm(a.startMin)}`;
  const bodyText = `Tenés un turno fijo asignado en ${clubName}: ${courtName}, todos los ${when}. Valor $${a.monthly}/mes.`;

  if (a.playerId) {
    await supabase.from("notifications").insert({
      player_id: a.playerId,
      type: "booking",
      title: "Turno fijo asignado",
      body: bodyText,
      url: null,
    });
  }
  if (a.email) {
    // fire-and-forget: no bloquea la creación si el mail falla.
    await supabase.functions
      .invoke("send-email", {
        body: {
          to: a.email,
          subject: `Tu turno fijo en ${clubName}`,
          heading: "Tenés tu turno fijo asignado",
          body: `Hola ${a.name}, ${clubName} te asignó un turno fijo: <b style="color:#F3F6F2">${courtName}, todos los ${when}</b>. Valor $${a.monthly} por mes. Te vamos a enviar el link de pago cada mes.`,
        },
      })
      .catch(() => {});
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
    const { data: match } = await supabase.rpc("find_player_by_phone", {
      p_phone: phone,
    });
    const found = Array.isArray(match) ? match[0] : match;
    if (found?.id) {
      playerId = found.id as string;
      playerEmail = (found.email as string) || null;
    }
  }

  const { data: inserted, error } = await supabase
    .from("fixed_bookings")
    .insert({
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
    })
    .select("id")
    .single();
  if (error || !inserted)
    return { ok: false, error: "No pudimos crear el turno fijo." };

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

  const { data: res, error: fnErr } = await supabase.functions.invoke(
    "mp-fixed-charge",
    { body: { fixed_booking_id: inserted.id } }
  );
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
  const { data: res, error } = await supabase.functions.invoke("mp-fixed-charge", {
    body: { fixed_booking_id: fixedBookingId, period },
  });
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

  await supabase
    .from("fixed_bookings")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("club_id", clubId);
  // Libera las ocurrencias futuras (las pasadas quedan como historial).
  await supabase
    .from("court_bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("fixed_booking_id", id)
    .gte("booking_date", today);
  revalidatePath("/admin/turnos-fijos");
  revalidatePath("/admin/agenda");
  return { ok: true };
}
