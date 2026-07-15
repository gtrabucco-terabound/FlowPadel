-- Config del motor de ocupación por club
create table if not exists club_occupancy (
  club_id uuid primary key references clubs(id) on delete cascade,
  enabled boolean not null default false,
  wa_target text,                          -- JID del grupo de WhatsApp (xxxx@g.us) o número
  discount_pct int not null default 30 check (discount_pct between 0 and 90),
  lead_minutes int not null default 120,   -- ofrecer descuento si el turno arranca dentro de X min
  updated_at timestamptz not null default now()
);
alter table club_occupancy enable row level security;
drop policy if exists occ_all on club_occupancy;
create policy occ_all on club_occupancy
  for all using (is_club_member(club_id)) with check (is_club_admin(club_id) or is_superadmin());

-- Ofertas last-minute por turno (descuento real que se aplica al reservar)
create table if not exists court_offers (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  court_id uuid not null references courts(id) on delete cascade,
  booking_date date not null,
  start_minutes int not null,
  discount_pct int not null check (discount_pct between 1 and 90),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (court_id, booking_date, start_minutes)
);
alter table court_offers enable row level security;
drop policy if exists coff_read on court_offers;
create policy coff_read on court_offers for select using (true);  -- ofertas visibles (para mostrar precio con descuento);