create table if not exists public.court_bookings (
  id             uuid primary key default gen_random_uuid(),
  club_id        uuid not null references public.clubs(id) on delete cascade,
  court_id       uuid not null references public.courts(id) on delete cascade,
  booking_date   date not null,
  start_minutes  smallint not null,               -- minutos desde medianoche (ej. 480 = 8:00)
  slot_minutes   smallint not null default 90,
  status         text not null default 'reserved'
                 check (status in ('reserved','held','blocked','cancelled')),
  kind           text not null default 'casual'   -- casual | fixed (mensual)
                 check (kind in ('casual','fixed')),
  player_id      uuid references public.players(id) on delete set null,
  customer_name  text,
  customer_phone text,
  customer_email text,
  price          numeric,
  paid_at        timestamptz,
  mp_payment_id  text,
  hold_expires_at timestamptz,
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_court_bookings_lookup
  on public.court_bookings(court_id, booking_date);
-- Un turno no se puede reservar dos veces (salvo que esté cancelado).
create unique index if not exists uq_court_booking_slot
  on public.court_bookings(court_id, booking_date, start_minutes)
  where status <> 'cancelled';

alter table public.court_bookings enable row level security;
drop policy if exists cb_all on public.court_bookings;
create policy cb_all on public.court_bookings for all
  using ( public.is_superadmin() or public.is_club_member(club_id) )
  with check ( public.is_superadmin() or public.is_club_member(club_id) );;