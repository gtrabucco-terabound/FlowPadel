-- Renovacion mensual: dia 1 a las 12:00 UTC (09:00 AR)
select cron.schedule(
  'fixed-renew-monthly',
  '0 12 1 * *',
  $$
  select net.http_post(
    url := 'https://ruppicqugjpnosuxyaoi.supabase.co/functions/v1/fixed-bookings-cron',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cHBpY3F1Z2pwbm9zdXh5YW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MDA4NjksImV4cCI6MjA5ODA3Njg2OX0.A0v5I6Bf-hgkbuUHhWF8f1ZsDbuUYMZt9EJ5i8EZs8o'
    ),
    body := jsonb_build_object('mode','renew')
  );
  $$
);

-- Recordatorio: dias 5 y 9 a las 12:00 UTC
select cron.schedule(
  'fixed-remind-5',
  '0 12 5 * *',
  $$
  select net.http_post(
    url := 'https://ruppicqugjpnosuxyaoi.supabase.co/functions/v1/fixed-bookings-cron',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cHBpY3F1Z2pwbm9zdXh5YW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MDA4NjksImV4cCI6MjA5ODA3Njg2OX0.A0v5I6Bf-hgkbuUHhWF8f1ZsDbuUYMZt9EJ5i8EZs8o'
    ),
    body := jsonb_build_object('mode','remind')
  );
  $$
);

select cron.schedule(
  'fixed-remind-9',
  '0 12 9 * *',
  $$
  select net.http_post(
    url := 'https://ruppicqugjpnosuxyaoi.supabase.co/functions/v1/fixed-bookings-cron',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cHBpY3F1Z2pwbm9zdXh5YW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MDA4NjksImV4cCI6MjA5ODA3Njg2OX0.A0v5I6Bf-hgkbuUHhWF8f1ZsDbuUYMZt9EJ5i8EZs8o'
    ),
    body := jsonb_build_object('mode','remind')
  );
  $$
);;