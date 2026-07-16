import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER") ?? "";
const GMAIL_PASS = Deno.env.get("GMAIL_APP_PASSWORD") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function card(heading: string, body: string, ctaLabel?: string, ctaUrl?: string): string {
  const cta = ctaLabel && ctaUrl
    ? `<tr><td style="padding:0 32px 6px 32px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#C7F94B;border-radius:12px"><a href="${ctaUrl}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#11201B;text-decoration:none;border-radius:12px">${esc(ctaLabel)}</a></td></tr></table></td></tr>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2EE;margin:0;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><tr><td align="center"><table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:92%;background:#161D1A;border:1px solid #26302B;border-radius:16px;overflow:hidden"><tr><td style="padding:28px 32px 8px 32px"><div style="font-size:20px;font-weight:700;color:#F3F6F2;letter-spacing:-0.3px">Flow<span style="color:#C7F94B">Padel</span></div></td></tr><tr><td style="padding:14px 32px 0 32px"><h1 style="margin:0 0 10px 0;font-size:22px;line-height:1.25;color:#F3F6F2;font-weight:700">${esc(heading)}</h1><p style="margin:0 0 22px 0;font-size:15px;line-height:1.6;color:#9BA69F">${body}</p></td></tr>${cta}<tr><td style="padding:18px 32px 26px 32px;border-top:1px solid #26302B"><p style="margin:0;font-size:12px;line-height:1.6;color:#636E67">Te llegó este mail desde FlowPadel.</p></td></tr></table><p style="margin:16px 0 0 0;font-size:11px;color:#7A837C">FlowPadel · Gestión de pádel</p></td></tr></table>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!GMAIL_USER || !GMAIL_PASS) return json({ error: "GMAIL no configurado" }, 200);
    const { to, subject, heading, body, cta_label, cta_url } = await req.json();
    if (!to || !subject || !heading) return json({ error: "faltan campos" }, 400);

    const client = new SMTPClient({
      connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: GMAIL_USER, password: GMAIL_PASS } },
    });
    await client.send({
      from: `FlowPadel <${GMAIL_USER}>`, to,
      subject, content: "auto",
      html: card(heading, body ?? "", cta_label, cta_url),
    });
    await client.close();
    return json({ ok: true, sent: 1 });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
