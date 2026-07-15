-- Turno fijo mensual: definicion recurrente (mismo dia/hora todas las semanas)
create table if not exists fixed_bookings (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  court_id uuid not null references courts(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_minutes smallint not null,
  slot_minutes smallint not null default 90,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  player_id uuid references players(id) on delete set null,
  monthly_price numeric not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_fixed_bookings_club on fixed_bookings(club_id) where active;

-- Cobro mensual del turno fijo (un cargo por periodo YYYY-MM)
create table if not exists fixed_booking_charges (
  id uuid primary key default gen_random_uuid(),
  fixed_booking_id uuid not null references fixed_bookings(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  period text not null, -- 'YYYY-MM'
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  due_date date,
  checkout_url text,
  mp_payment_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fixed_booking_id, period)
);
create index if not exists idx_fixed_charges_club on fixed_booking_charges(club_id, status);

-- Vinculo de cada turno generado con su turno fijo
alter table court_bookings
  add column if not exists fixed_booking_id uuid references fixed_bookings(id) on delete set null;

-- RLS
alter table fixed_bookings enable row level security;
alter table fixed_booking_charges enable row level security;

drop policy if exists fb_all on fixed_bookings;
create policy fb_all on fixed_bookings
  for all using (is_club_member(club_id)) with check (is_club_member(club_id));

drop policy if exists fbc_all on fixed_booking_charges;
create policy fbc_all on fixed_booking_charges
  for all using (is_club_member(club_id)) with check (is_club_member(club_id));;