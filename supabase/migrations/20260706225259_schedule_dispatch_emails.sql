create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Corre el worker cada 2 minutos para vaciar la cola de emails.
select cron.schedule(
  'dispatch-emails-2min',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://ruppicqugjpnosuxyaoi.supabase.co/functions/v1/dispatch-emails',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cHBpY3F1Z2pwbm9zdXh5YW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MDA4NjksImV4cCI6MjA5ODA3Njg2OX0.A0v5I6Bf-hgkbuUHhWF8f1ZsDbuUYMZt9EJ5i8EZs8o'
    ),
    body := '{}'::jsonb
  );
  $$
);;