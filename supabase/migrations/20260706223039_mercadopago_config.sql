-- Credenciales de MP por club (NO en clubs, que es de lectura pública).
create table if not exists public.club_payment_settings (
  club_id         uuid primary key references public.clubs(id) on delete cascade,
  mp_access_token text,
  mp_public_key   text,
  mp_connected    boolean generated always as (mp_access_token is not null and mp_access_token <> '') stored,
  updated_at      timestamptz not null default now()
);
alter table public.club_payment_settings enable row level security;

-- Solo el admin del club (o superadmin) ve/edita las credenciales. Nunca público.
drop policy if exists cps_select on public.club_payment_settings;
create policy cps_select on public.club_payment_settings for select
  using ( public.is_superadmin() or public.is_club_admin(club_id) );
drop policy if exists cps_write on public.club_payment_settings;
create policy cps_write on public.club_payment_settings for all
  using ( public.is_superadmin() or public.is_club_admin(club_id) )
  with check ( public.is_superadmin() or public.is_club_admin(club_id) );

-- Config de cobro online por torneo.
alter table public.events
  add column if not exists deposit_type  text not null default 'none'
    check (deposit_type in ('none','fixed','percent','full')),
  add column if not exists deposit_value numeric not null default 0;;