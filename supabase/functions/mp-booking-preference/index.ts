import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://flow-padel.vercel.app";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const ddmm = (d: string) => { const [y, mo, da] = d.split("-"); return `${da}/${mo}`; };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { booking_id } = await req.json();
    if (!booking_id) return json({ error: "falta booking_id" }, 400);
    const db = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: b } = await db.from("court_bookings")
      .select("id, club_id, court_id, booking_date, start_minutes, price, hold_expires_at").eq("id", booking_id).maybeSingle();
    if (!b) return json({ error: "reserva no encontrada" }, 404);

    const fullPrice = Math.round(Number(b.price ?? 0));
    if (fullPrice <= 0) return json({ error: "La cancha no tiene precio por turno configurado" }, 400);

    const { data: court } = await db.from("courts").select("name").eq("id", b.court_id).maybeSingle();
    const { data: club } = await db.from("clubs").select("name").eq("id", b.club_id).maybeSingle();
    const { data: cps } = await db.from("club_payment_settings")
      .select("mp_access_token, booking_charge_type, booking_charge_value").eq("club_id", b.club_id).maybeSingle();
    const token = cps?.mp_access_token;
    if (!token) return json({ error: "El club no conecto Mercado Pago" }, 400);

    const chargeType = cps?.booking_charge_type ?? "full";
    const chargeValue = Number(cps?.booking_charge_value ?? 0);
    let amount = fullPrice;
    if (chargeType === "percent" && chargeValue > 0) amount = Math.round((fullPrice * chargeValue) / 100);
    else if (chargeType === "fixed" && chargeValue > 0) amount = Math.min(Math.round(chargeValue), fullPrice);
    if (amount <= 0) amount = fullPrice;

    const clubName = club?.name ?? "Club";
    const isSena = amount < fullPrice;
    const title = `${clubName} · Reserva ${court?.name ?? "cancha"} · ${ddmm(b.booking_date)} ${hhmm(b.start_minutes)}${isSena ? " (seña)" : ""}`;

    // El link expira junto con el hold (para no poder pagar un turno ya liberado).
    const expTo = b.hold_expires_at ? new Date(b.hold_expires_at).toISOString() : new Date(Date.now() + 30 * 60000).toISOString();

    const pref = {
      items: [{ title, quantity: 1, unit_price: amount, currency_id: "ARS" }],
      statement_descriptor: clubName.slice(0, 22),
      external_reference: `booking:${booking_id}`,
      back_urls: { success: `${APP_URL}/?pago=ok`, failure: `${APP_URL}/?pago=error`, pending: `${APP_URL}/?pago=pendiente` },
      auto_return: "approved",
      expires: true,
      expiration_date_to: expTo,
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook?club=${b.club_id}`,
    };
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(pref),
    });
    const mp = await mpRes.json();
    if (!mpRes.ok) return json({ error: "MP rechazo la preferencia", detail: mp }, 400);

    await db.from("court_bookings")
      .update({ checkout_url: mp.init_point, amount_charged: amount })
      .eq("id", booking_id);

    return json({ ok: true, checkout_url: mp.init_point, amount, full_price: fullPrice });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
