import type { createClient } from "@/lib/supabase/server";

/** Cliente Supabase server-side (RLS aplica sobre él). */
type DB = Awaited<ReturnType<typeof createClient>>;

export type PaymentLinkKind = "deposit" | "remainder" | "full";

/**
 * Genera un link de Checkout Pro para la seña/inscripción de una inscripción.
 * Fuente única: antes esta llamada estaba duplicada en la inscripción pública
 * y en el panel de eventos.
 */
export async function requestRegistrationPaymentLink(
  registrationId: string,
  kind: PaymentLinkKind = "deposit"
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !anon) return { ok: false, error: "Config incompleta." };
  try {
    const res = await fetch(`${base}/functions/v1/mp-create-preference`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ registration_id: registrationId, kind }),
    });
    const data = await res.json();
    if (!res.ok || !data.checkout_url) {
      return { ok: false, error: data.error ?? "No se pudo generar el pago." };
    }
    return { ok: true, url: data.checkout_url as string };
  } catch {
    return { ok: false, error: "No pudimos conectar con Mercado Pago." };
  }
}

/** Marca un pago de inscripción como pagado o pendiente. */
export async function markPaymentStatus(
  supabase: DB,
  eventId: string,
  paymentId: string,
  status: "paid" | "pending"
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("payments")
    .update({
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", paymentId)
    .eq("event_id", eventId);
  return { error: Boolean(error) };
}

/* ---- Info pública de pago de una reserva (/pagar/[id]) ---- */

export type BookingPayInfo = {
  checkout_url: string | null;
  status: string;
  paid: boolean;
  amount: number | null;
  date: string;
  start: number;
  club: string;
  court: string | null;
  court_number: number | null;
} | null;

/** Datos mínimos para la pantalla de pago de un turno (RPC pública). */
export async function getBookingPayInfo(
  supabase: DB,
  bookingId: string
): Promise<BookingPayInfo> {
  const { data } = await supabase.rpc("public_booking_payinfo", {
    p_id: bookingId,
  });
  return (data ?? null) as unknown as BookingPayInfo;
}

/* ---- Configuración de cobro del club ---- */

export type BookingChargeType = "full" | "percent" | "fixed";

/**
 * La columna `booking_charge_type` es `text` en la BD; acá se estrecha al
 * conjunto de valores válidos del dominio.
 */
export type ClubPaymentSettings = {
  mp_connected: boolean;
  booking_charge_type: BookingChargeType | null;
  booking_charge_value: number | null;
  booking_pay_at_club: boolean | null;
};

/** Config de cobro del club (para Ajustes). */
export async function getClubPaymentSettings(
  supabase: DB,
  clubId: string
): Promise<ClubPaymentSettings | null> {
  const { data } = await supabase
    .from("club_payment_settings")
    .select(
      "mp_connected, booking_charge_type, booking_charge_value, booking_pay_at_club"
    )
    .eq("club_id", clubId)
    .maybeSingle();
  return (data as unknown as ClubPaymentSettings) ?? null;
}

/** Guarda las credenciales de Mercado Pago del club. */
export async function upsertClubPaymentTokens(
  supabase: DB,
  clubId: string,
  tokens: { mp_access_token?: string; mp_public_key?: string | null }
): Promise<{ error: boolean }> {
  const { error } = await supabase.from("club_payment_settings").upsert(
    { club_id: clubId, ...tokens, updated_at: new Date().toISOString() },
    { onConflict: "club_id" }
  );
  return { error: Boolean(error) };
}

/** Define cuánto se cobra online al reservar (seña o total) y el pago en el club. */
export async function updateBookingChargePolicy(
  supabase: DB,
  clubId: string,
  policy: {
    booking_charge_type: "full" | "percent" | "fixed";
    booking_charge_value: number | null;
    booking_pay_at_club: boolean;
  }
): Promise<{ error: boolean }> {
  const { error } = await supabase.from("club_payment_settings").upsert(
    { club_id: clubId, ...policy, updated_at: new Date().toISOString() },
    { onConflict: "club_id" }
  );
  return { error: Boolean(error) };
}

/** Desconecta Mercado Pago (borra las credenciales del club). */
export async function disconnectClubPaymentTokens(
  supabase: DB,
  clubId: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("club_payment_settings")
    .update({
      mp_access_token: null,
      mp_public_key: null,
      updated_at: new Date().toISOString(),
    })
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}
