import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const clubId = url.searchParams.get("club");
    let paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");
    let body: any = null;
    try { body = await req.json(); } catch { /* sin body */ }
    if (!paymentId && body) paymentId = body?.data?.id ?? body?.id ?? null;
    if (!paymentId || !clubId) return new Response("ok", { status: 200 });

    const db = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: cps } = await db.from("club_payment_settings")
      .select("mp_access_token").eq("club_id", clubId).maybeSingle();
    const token = cps?.mp_access_token;
    if (!token) return new Response("ok", { status: 200 });

    const pRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const p = await pRes.json();
    if (!pRes.ok) return new Response("ok", { status: 200 });

    const status: string = p.status ?? "pending";
    const extRef: string = p.external_reference ?? "";
    const idx = extRef.indexOf(":");
    const head = idx >= 0 ? extRef.slice(0, idx) : extRef;
    const rest = idx >= 0 ? extRef.slice(idx + 1) : "";

    // ---- Reserva de cancha ----
    if (head === "booking") {
      const bookingId = rest;
      if (!bookingId) return new Response("ok", { status: 200 });
      if (status === "approved") {
        await db.from("court_bookings").update({
          status: "reserved", paid_at: new Date().toISOString(),
          mp_payment_id: String(paymentId), updated_at: new Date().toISOString(),
        }).eq("id", bookingId);
      } else if (status === "rejected" || status === "cancelled") {
        await db.from("court_bookings").update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", bookingId).eq("status", "held");
      }
      return new Response("ok", { status: 200 });
    }

    // ---- Turno fijo mensual ----
    if (head === "fixedcharge") {
      const chargeId = rest;
      if (!chargeId) return new Response("ok", { status: 200 });
      if (status === "approved") {
        await db.from("fixed_booking_charges").update({
          status: "paid", paid_at: new Date().toISOString(),
          mp_payment_id: String(paymentId), updated_at: new Date().toISOString(),
        }).eq("id", chargeId);
      }
      return new Response("ok", { status: 200 });
    }

    // ---- Inscripcion a torneo ----
    const registrationId = head;
    const kind = rest;
    if (!registrationId) return new Response("ok", { status: 200 });

    await db.from("mp_payments").update({
      status, mp_payment_id: String(paymentId), updated_at: new Date().toISOString(),
    }).eq("registration_id", registrationId).eq("kind", kind || "deposit");

    if (status === "approved" && (kind === "deposit" || kind === "full" || !kind)) {
      await db.rpc("confirm_paid_registration", { p_registration_id: registrationId });
      const { data: reg } = await db.from("registrations")
        .select("player_1_id, event_id").eq("id", registrationId).maybeSingle();
      if (reg?.player_1_id) {
        const { data: ev } = await db.from("events").select("name, slug").eq("id", reg.event_id).maybeSingle();
        await db.from("notifications").insert({
          player_id: reg.player_1_id, type: "payment",
          title: "Pago recibido - lugar confirmado",
          body: `Recibimos tu pago de "${ev?.name ?? "el torneo"}". Tu lugar quedo confirmado.`,
          url: ev?.slug ? `/event/${ev.slug}` : null, event_id: reg.event_id,
        });
      }
    }
    return new Response("ok", { status: 200 });
  } catch (_e) {
    return new Response("ok", { status: 200 });
  }
});
