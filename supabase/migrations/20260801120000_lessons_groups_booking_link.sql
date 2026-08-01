-- Vincula clases y grupos con la reserva de cancha que crean, para poder
-- liberar la cancha al cancelar (evita bloqueos "fantasma").
alter table lessons
  add column if not exists booking_id uuid references court_bookings(id) on delete set null;

alter table group_sessions
  add column if not exists booking_id uuid references court_bookings(id) on delete set null;
