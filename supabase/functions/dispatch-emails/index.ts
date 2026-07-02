// Edge Function: dispatch-emails
// Lee la cola `tournament_invites` (channel='email', status='queued') y envía
// cada aviso por SMTP de Gmail (flowpadel@gmail.com + App Password).
//
// DORMIDA hasta que se configuren los secrets y se despliegue:
//   supabase secrets set GMAIL_USER=flowpadel@gmail.com GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
//   supabase functions deploy dispatch-emails
// Luego se agenda con pg_cron (ver README) para correr cada 1–2 min.
//
// Nota: Gmail SMTP ~500 mails/día. Para escalar, migrar a Resend + dominio.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
const GMAIL_PASS = Deno.env.get("GMAIL_APP_PASSWORD")!;
const APP_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://flow-padel.vercel.app";
const BATCH = Number(Deno.env.get("EMAIL_BATCH") ?? "50");

type InviteRow = {
  id: string;
  event_id: string;
  player: { email: string | null; full_name: string | null } | null;
  event: { name: string | null; slug: string | null } | null;
};

Deno.serve(async () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1) Tomar un lote de la cola de emails pendientes.
  const { data, error } = await admin
    .from("tournament_invites")
    .select(
      "id, event_id, player:players(email, full_name), event:events(name, slug)"
    )
    .eq("channel", "email")
    .eq("status", "queued")
    .limit(BATCH);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
  const invites = (data ?? []) as unknown as InviteRow[];
  if (invites.length === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: 0 }), {
      status: 200,
    });
  }

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: GMAIL_USER, password: GMAIL_PASS },
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const inv of invites) {
    const to = inv.player?.email;
    const eventName = inv.event?.name ?? "un torneo";
    const link = inv.event?.slug ? `${APP_URL}/event/${inv.event.slug}` : APP_URL;

    // Sin email del jugador → marcar skipped (no reintentar).
    if (!to) {
      await admin
        .from("tournament_invites")
        .update({ status: "skipped", reason: "sin email" })
        .eq("id", inv.id);
      skipped++;
      continue;
    }

    try {
      await client.send({
        from: `FlowPadel <${GMAIL_USER}>`,
        to,
        subject: `Nuevo torneo: ${eventName}`,
        content: "auto",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto">
            <h2 style="color:#111">Se abrió un torneo para vos 🎾</h2>
            <p>Hola${inv.player?.full_name ? " " + inv.player.full_name : ""}, se abrieron
            las inscripciones de <b>${eventName}</b>.</p>
            <p><a href="${link}" style="display:inline-block;background:#C7F94B;color:#11201B;
              padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600">
              Ver el torneo e inscribirme</a></p>
            <p style="color:#888;font-size:12px">Recibís este aviso porque activaste las
            notificaciones de torneos en FlowPadel. Podés desactivarlas en tu perfil.</p>
          </div>`,
      });
      await admin
        .from("tournament_invites")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", inv.id);
      sent++;
    } catch (e) {
      await admin
        .from("tournament_invites")
        .update({ status: "failed", reason: String(e).slice(0, 300) })
        .eq("id", inv.id);
      failed++;
    }
  }

  await client.close();
  return new Response(JSON.stringify({ sent, skipped, failed }), {
    status: 200,
  });
});
