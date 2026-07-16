-- Cada 2 h de 08 a 20 hs AR (11 a 23 UTC): publica turnos libres al grupo
select cron.schedule(
  'occupancy-publish',
  '0 11,13,15,17,19,21,23 * * *',
  $$
  select net.http_post(
    url := 'https://ruppicqugjpnosuxyaoi.supabase.co/functions/v1/occupancy-publish',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cHBpY3F1Z2pwbm9zdXh5YW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MDA4NjksImV4cCI6MjA5ODA3Njg2OX0.A0v5I6Bf-hgkbuUHhWF8f1ZsDbuUYMZt9EJ5i8EZs8o'
    ),
    body := jsonb_build_object('trigger','cron')
  );
  $$
);;