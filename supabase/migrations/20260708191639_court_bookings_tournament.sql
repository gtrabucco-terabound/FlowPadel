-- Permite bloqueos de torneo vinculados al evento
alter table court_bookings
  add column if not exists event_id uuid references events(id) on delete cascade;

alter table court_bookings drop constraint if exists court_bookings_kind_check;
alter table court_bookings add constraint court_bookings_kind_check
  check (kind = any (array['casual','fixed','tournament']));

create index if not exists idx_court_bookings_event on court_bookings(event_id) where event_id is not null;;