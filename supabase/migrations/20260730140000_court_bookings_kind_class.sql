-- Permitir turnos de tipo 'class' (clases con profe) en la agenda.
alter table court_bookings drop constraint if exists court_bookings_kind_check;
alter table court_bookings add constraint court_bookings_kind_check
  check (kind = any (array['casual','fixed','tournament','class']));
