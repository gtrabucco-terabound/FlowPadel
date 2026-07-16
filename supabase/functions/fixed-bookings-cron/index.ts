import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MONTHS = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const prettyPeriod = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return `${MONTHS[m]} ${y}`;
};
function periodOffset(months: number): string {
  const now = new Date(Date.now() - 3 * 3600 * 1000);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function ensureCharge(fbId: string, period: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/mp-fixed-charge`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fixed_booking_id: fbId, period }),
  });
  return await res.json().catch(() => null);
}

async function sendEmail(to: string, subject: string, heading: string, body: string, url: string) {
  await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, heading, body, cta_label: "Pagar el mes", cta_url: url }),
  }).catch(() => {});
}

Deno.serve(async (req) => {
  try {
    const { mode } = await req.json().catch(() => ({ mode: "remind" }));
    const db = createClient(SUPABASE_URL, SERVICE_ROLE);

    // ---- RENOVACION: genera el mes siguiente y avisa ----
    if (mode === "renew") {
      const period = periodOffset(1);
      const { data: fbs } = await db.from("fixed_bookings")
        .select("id, club_id, player_id, customer_name, customer_email, club:clubs(name)")
        .eq("active", true);
      let done = 0;
      for (const fb of fbs ?? []) {
        const r = await ensureCharge(fb.id, period);
        if (!r?.checkout_url || r?.already_paid) continue;
        const clubName = (fb as any).club?.name ?? "tu club";
        const msg = `Ya está disponible el pago de tu turno fijo de ${prettyPeriod(period)} en ${clubName}. Vence el 10.`;
        if (fb.player_id) {
          await db.from("notifications").insert({
            player_id: fb.player_id, type: "payment", title: `Turno fijo ${prettyPeriod(period)}`,
            body: msg, url: r.checkout_url,
          });
        }
        const email = fb.customer_email;
        if (email) await sendEmail(email, `Tu turno fijo de ${prettyPeriod(period)}`, "Renovación de tu turno fijo", msg, r.checkout_url);
        done++;
      }
      return new Response(JSON.stringify({ mode, period, done }), { status: 200 });
    }

    // ---- RECORDATORIO: impagos del mes en curso ----
    const period = periodOffset(0);
    const { data: charges } = await db.from("fixed_booking_charges")
      .select("id, checkout_url, fixed_booking:fixed_bookings(id, active, player_id, customer_name, customer_email, club:clubs(name))")
      .eq("period", period).eq("status", "pending").not("checkout_url", "is", null);
    let done = 0;
    for (const ch of charges ?? []) {
      const fb = (ch as any).fixed_booking;
      if (!fb?.active) continue;
      const clubName = fb.club?.name ?? "tu club";
      const msg = `Recordatorio: tenés pendiente el pago de tu turno fijo de ${prettyPeriod(period)} en ${clubName}. Vence el 10.`;
      if (fb.player_id) {
        await db.from("notifications").insert({
          player_id: fb.player_id, type: "payment", title: `Recordatorio de pago ${prettyPeriod(period)}`,
          body: msg, url: ch.checkout_url,
        });
      }
      if (fb.customer_email) await sendEmail(fb.customer_email, `Recordatorio: turno fijo ${prettyPeriod(period)}`, "Te queda pendiente el pago", msg, ch.checkout_url);
      done++;
    }
    return new Response(JSON.stringify({ mode: "remind", period, done }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
