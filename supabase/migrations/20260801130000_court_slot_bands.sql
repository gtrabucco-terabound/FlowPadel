-- Franjas de turno por cancha: permiten que una cancha tenga turnos de distinta
-- duración según la hora (ej. 08–16 clases de 1h, 16–23 alquiler de 1.5h).
-- Si una cancha no tiene franjas, se usa el slot_minutes/precio legacy.
create table if not exists court_slot_bands (
  id            uuid primary key default gen_random_uuid(),
  court_id      uuid not null references courts(id) on delete cascade,
  start_minutes integer not null,
  end_minutes   integer not null,
  slot_minutes  integer not null,
  price         numeric,
  created_at    timestamptz not null default now(),
  check (end_minutes > start_minutes and slot_minutes > 0)
);

create index if not exists court_slot_bands_court_idx on court_slot_bands (court_id);

alter table court_slot_bands enable row level security;

drop policy if exists court_slot_bands_club on court_slot_bands;
create policy court_slot_bands_club on court_slot_bands for all to authenticated
  using (exists (select 1 from courts c where c.id = court_id and is_club_member(c.club_id)))
  with check (exists (select 1 from courts c where c.id = court_id and is_club_member(c.club_id)));

-- Lectura pública para la reserva por la app pública (igual que las canchas).
drop policy if exists court_slot_bands_public_read on court_slot_bands;
create policy court_slot_bands_public_read on court_slot_bands for select to anon
  using (true);
