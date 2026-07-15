select cron.schedule(
  'expire-booking-holds',
  '*/5 * * * *',
  $$
  update court_bookings
     set status = 'cancelled', updated_at = now()
   where status = 'held' and hold_expires_at is not null and hold_expires_at < now();
  $$
);;