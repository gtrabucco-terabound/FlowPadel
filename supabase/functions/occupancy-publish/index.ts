import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP = Deno.env.get("APP_PUBLIC_URL") ?? "https://flow-padel.vercel.app";
const EVO = "http://padelflow-evolutionapi-b6b005-144-126-152-42.traefik.me";
const EVO_KEY = "CE68C3157168-4308-82BA-AF2024595080";
const INSTANCE = "flowpadel";

const hhmm = (m: number) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
const arNow = () => new Date(Date.now() - 3*3600*1000);
const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
function dow(iso: string){ const js = new Date(iso+"T12:00:00Z").getUTCDay(); return js===0?7:js; }

async function sendText(number: string, text: string) {
  try {
    await fetch(`${EVO}/message/sendText/${INSTANCE}`, {
      method: "POST", headers: { apikey: EVO_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ number, text }),
    });
    return true;
  } catch (_e) { return false; }
}

Deno.serve(async () => {
  const db = createClient(SUPABASE_URL, SERVICE_ROLE);
  const t = arNow();
  const iso = fmt(t);
  const nowMin = t.getUTCHours()*60 + t.getUTCMinutes();
  const d = dow(iso);

  const { data: clubs } = await db.from("club_occupancy")
    .select("club_id, wa_target, discount_pct, lead_minutes, segment_enabled, segment_min_matches, segment_inactive_days, segment_discount_pct, segment_max_per_run, club:clubs(slug,name,plan:plans(f_occupancy))")
    .eq("enabled", true);

  let posted = 0; let invited = 0;
  for (const c of (clubs ?? []) as any[]) {
    const slug = c.club?.slug; const name = c.club?.name ?? "el club";
    if (!slug) continue;
    // Gating por plan: si el club tiene un plan asignado y NO incluye ocupación,
    // se saltea. Sin plan asignado ⇒ permitido (mismo criterio que la app).
    const plan = c.club?.plan;
    if (plan && plan.f_occupancy === false) continue;
    const { data: dayRaw } = await db.rpc("public_court_day", { p_slug: slug, p_date: iso });
    const day: any = dayRaw ?? {};
    const courts = day.courts ?? []; const taken = day.bookings ?? [];

    const free: { court_id:string; court:string; start:number; price:number }[] = [];
    for (const co of courts) {
      const ops = co.operating_days ?? [1,2,3,4,5,6,7];
      if (!ops.includes(d)) continue;
      const step = co.slot_minutes || 90;
      for (let m = co.open_hour*60; m + step <= co.close_hour*60; m += step) {
        if (m <= nowMin) continue; // solo lo que queda del día
        const busy = taken.some((b:any)=> b.court_id===co.id && m < b.start_minutes+b.slot_minutes && m+step > b.start_minutes);
        if (!busy) free.push({ court_id: co.id, court: `${co.number?("#"+co.number+" "):""}${co.name}`, start: m, price: Number(co.price_per_slot||0) });
      }
    }
    if (free.length === 0) continue;
    free.sort((a,b)=> a.start-b.start);

    const disc = c.discount_pct ?? 30;
    const lead = c.lead_minutes ?? 120;

    // ¿Hay al menos un turno con oferta activa (cerca de arrancar y vacío)?
    let hasOffer = false;
    const lines: string[] = [];
    for (const s of free.slice(0, 12)) {
      const near = (s.start - nowMin) <= lead && s.price > 0 && disc > 0;
      if (near) {
        hasOffer = true;
        const newPrice = Math.round(s.price * (100 - disc) / 100);
        const expires = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 0, s.start + 180)).toISOString();
        await db.from("court_offers").upsert({
          club_id: c.club_id, court_id: s.court_id, booking_date: iso, start_minutes: s.start,
          discount_pct: disc, expires_at: expires,
        }, { onConflict: "court_id,booking_date,start_minutes" });
        lines.push(`🔥 ${s.court} · ${hhmm(s.start)} · *$${newPrice}* (${disc}% OFF, últimos lugares)`);
      } else {
        lines.push(`• ${s.court} · ${hhmm(s.start)}${s.price>0?` · $${s.price}`:""}`);
      }
    }

    // === Canal 1: publicación al grupo (si hay target) ===
    if (c.wa_target) {
      const text = `🎾 *Turnos libres hoy en ${name}*\n\n${lines.join("\n")}\n\nReservá y pagá acá 👉 ${APP}/reservar/${slug}`;
      if (await sendText(c.wa_target, text)) posted++;
    }

    // === Canal 2: invitaciones dirigidas a jugadores segmentados ===
    // Solo si el club lo activó y realmente hay una oferta last-minute que ofrecer.
    if (c.segment_enabled && hasOffer) {
      const sDisc = c.segment_discount_pct ?? 20;
      const { data: players } = await db.rpc("eligible_offer_players", {
        p_club_id: c.club_id,
        p_min_matches: c.segment_min_matches ?? 3,
        p_inactive_days: c.segment_inactive_days ?? 21,
        p_max_n: c.segment_max_per_run ?? 15,
      });
      for (const p of (players ?? []) as any[]) {
        const first = (p.full_name ?? "").trim().split(/\s+/)[0] || "Hola";
        const hook = p.reason === "fiel"
          ? `Como sos de la casa, te reservamos un beneficio 🎾`
          : `¡Te extrañamos en la cancha! Volvé con un beneficio 🎾`;
        const msg = `${first}, ${hook}\n\nHay turnos libres hoy en *${name}* con hasta *${sDisc}% OFF*.\n\nElegí el tuyo y reservá 👉 ${APP}/reservar/${slug}\n\n_Para no recibir estas ofertas, avisale al club._`;
        const ok = await sendText(p.phone, msg);
        if (ok) {
          invited++;
          await db.from("player_offer_invites").insert({
            club_id: c.club_id, player_id: p.player_id, invite_date: iso, discount_pct: sDisc,
          });
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, clubs_posted: posted, players_invited: invited }), { status: 200, headers: { "Content-Type": "application/json" } });
});
