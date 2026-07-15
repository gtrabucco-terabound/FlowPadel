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
const DOW = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** Mes actual en horario Argentina (UTC-3), formato YYYY-MM. */
function currentPeriod(): string {
  const now = new Date(Date.now() - 3 * 3600 * 1000);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { fixed_booking_id, period: periodIn } = await req.json();
    if (!fixed_booking_id) return json({ error: "falta fixed_booking_id" }, 400);
    const period = /^\d{4}-\d{2}$/.test(periodIn ?? "") ? periodIn : currentPeriod();
    const db = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: fb } = await db.from("fixed_bookings")
      .select("id, club_id, court_id, weekday, start_minutes, slot_minutes, customer_name, customer_phone, player_id, monthly_price, active")
      .eq("id", fixed_booking_id).maybeSingle();
    if (!fb) return json({ error: "turno fijo no encontrado" }, 404);

    const [y, m] = period.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

    // Genera las ocurrencias del mes (bloquea la agenda). Ignora choques.
    let created = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(Date.UTC(y, m - 1, day, 12));
      const js = d.getUTCDay();
      const our = js === 0 ? 7 : js;
      if (our !== fb.weekday) continue;
      const dateISO = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const { error } = await db.from("court_bookings").insert({
        club_id: fb.club_id, court_id: fb.court_id, booking_date: dateISO,
        start_minutes: fb.start_minutes, slot_minutes: fb.slot_minutes,
        status: "reserved", kind: "fixed", customer_name: fb.customer_name,
        customer_phone: fb.customer_phone, player_id: fb.player_id,
        fixed_booking_id: fb.id,
      });
      if (!error) created++;
    }

    // Cargo mensual (uno por periodo).
    const amount = Math.round(Number(fb.monthly_price ?? 0));
    if (amount <= 0) return json({ error: "El turno fijo no tiene precio mensual" }, 400);
    const dueDate = `${period}-10`;
    const { data: charge } = await db.from("fixed_booking_charges")
      .upsert({ fixed_booking_id: fb.id, club_id: fb.club_id, period, amount, due_date: dueDate, updated_at: new Date().toISOString() },
        { onConflict: "fixed_booking_id,period" })
      .select("id, status, checkout_url").single();
    if (!charge) return json({ error: "no se pudo crear el cargo" }, 500);
    if (charge.status === "paid") return json({ ok: true, already_paid: true, occurrences: created });
    if (charge.checkout_url) return json({ ok: true, checkout_url: charge.checkout_url, amount, occurrences: created });

    const { data: court } = await db.from("courts").select("name").eq("id", fb.court_id).maybeSingle();
    const { data: club } = await db.from("clubs").select("name").eq("id", fb.club_id).maybeSingle();
    const { data: cps } = await db.from("club_payment_settings").select("mp_access_token").eq("club_id", fb.club_id).maybeSingle();
    const token = cps?.mp_access_token;
    if (!token) return json({ error: "El club no conecto Mercado Pago" }, 400);

    const clubName = club?.name ?? "Club";
    const title = `${clubName} · Turno fijo ${court?.name ?? "cancha"} · ${DOW[fb.weekday]} ${hhmm(fb.start_minutes)} · ${period}`;
    const pref = {
      items: [{ title, quantity: 1, unit_price: amount, currency_id: "ARS" }],
      statement_descriptor: clubName.slice(0, 22),
      external_reference: `fixedcharge:${charge.id}`,
      back_urls: { success: `${APP_URL}/?pago=ok`, failure: `${APP_URL}/?pago=error`, pending: `${APP_URL}/?pago=pendiente` },
      auto_return: "approved",
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook?club=${fb.club_id}`,
    };
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(pref),
    });
    const mp = await mpRes.json();
    if (!mpRes.ok) return json({ error: "MP rechazo la preferencia", detail: mp }, 400);

    await db.from("fixed_booking_charges").update({ checkout_url: mp.init_point }).eq("id", charge.id);
    return json({ ok: true, checkout_url: mp.init_point, amount, occurrences: created });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
