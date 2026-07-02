# dispatch-emails — worker de avisos por email

Lee la cola `tournament_invites` (channel=`email`, status=`queued`) y envía cada
aviso por **SMTP de Gmail**. Marca `sent` / `failed` / `skipped`.

## Estado: DORMIDO
Escrito y listo. No despliega ni envía nada hasta completar los pasos de abajo.

## Prerrequisitos (los hace el humano)
1. Cuenta **flowpadel@gmail.com** (personal, gratis).
2. **Verificación en 2 pasos** activada.
3. **Contraseña de aplicación** (16 caracteres) generada en
   myaccount.google.com → Seguridad → Contraseñas de aplicaciones.

## Activar (cuando haya App Password)
```bash
# 1) Secrets
supabase secrets set \
  GMAIL_USER=flowpadel@gmail.com \
  GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx \
  APP_PUBLIC_URL=https://flow-padel.vercel.app

# 2) Deploy
supabase functions deploy dispatch-emails

# 3) Agendar cada 1 min con pg_cron (SQL en Supabase):
#    select cron.schedule('dispatch-emails','*/1 * * * *',
#      $$ select net.http_post(
#           url:='https://<ref>.functions.supabase.co/dispatch-emails',
#           headers:='{"Authorization":"Bearer <SERVICE_ROLE>"}'::jsonb) $$);
```
SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.

## Notas
- Límite Gmail ~500 mails/día. Para escalar → Resend + dominio (cambiar el bloque SMTP).
- Los mails de **auth** (verificación de cuenta, recupero de contraseña) NO usan esta
  función: se configuran en Supabase → Auth → SMTP con las mismas credenciales de Gmail.
