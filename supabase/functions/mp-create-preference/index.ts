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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { registration_id, kind = "deposit" } = await req.json();
    if (!registration_id) return json({ error: "falta registration_id" }, 400);
    const db = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: reg } = await db.from("registrations")
      .select("id, event_id, club_id, player_1_name, player_2_name").eq("id", registration_id).maybeSingle();
    if (!reg) return json({ error: "inscripcion no encontrada" }, 404);

    const { data: ev } = await db.from("events")
      .select("name, slug, deposit_type, deposit_value, inscription_per_person").eq("id", reg.event_id).maybeSingle();
    if (!ev) return json({ error: "evento no encontrado" }, 404);

    const { data: cps } = await db.from("club_payment_settings")
      .select("mp_access_token").eq("club_id", reg.club_id).maybeSingle();
    const token = cps?.mp_access_token;
    if (!token) return json({ error: "El club no conecto Mercado Pago" }, 400);

    const players = reg.player_2_name ? 2 : 1;
    const base = Number(ev.inscription_per_person ?? 0) * players;
    const dtype = ev.deposit_type ?? "none";
    const dval = Number(ev.deposit_value ?? 0);
    let deposit = 0;
    if (dtype === "full") deposit = base;
    else if (dtype === "fixed") deposit = dval;
    else if (dtype === "percent") deposit = base * (dval / 100);
    let amount = 0;
    let label = "";
    if (kind === "remainder") { amount = Math.max(0, base - deposit); label = "saldo"; }
    else if (kind === "full") { amount = base; label = "inscripcion"; }
    else { amount = deposit; label = "sena"; }
    amount = Math.round(amount);
    if (amount <= 0) return json({ error: "Monto en 0: configura el precio/cobro en Economia" }, 400);

    const pref = {
      items: [{ title: `${ev.name} - ${label}`, quantity: 1, unit_price: amount, currency_id: "ARS" }],
      external_reference: `${registration_id}:${kind}`,
      back_urls: {
        success: `${APP_URL}/event/${ev.slug}?pago=ok`,
        failure: `${APP_URL}/event/${ev.slug}?pago=error`,
        pending: `${APP_URL}/event/${ev.slug}?pago=pendiente`,
      },
      auto_return: "approved",
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook?club=${reg.club_id}`,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(pref),
    });
    const mp = await mpRes.json();
    if (!mpRes.ok) return json({ error: "MP rechazo la preferencia", detail: mp }, 400);

    await db.from("mp_payments").insert({
      registration_id, event_id: reg.event_id, club_id: reg.club_id,
      kind, amount, status: "pending", preference_id: mp.id, checkout_url: mp.init_point,
    });

    return json({ ok: true, checkout_url: mp.init_point, amount });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
