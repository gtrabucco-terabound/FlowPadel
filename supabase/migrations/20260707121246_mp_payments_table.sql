create table if not exists public.mp_payments (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid references public.registrations(id) on delete cascade,
  event_id        uuid references public.events(id) on delete cascade,
  club_id         uuid references public.clubs(id) on delete cascade,
  kind            text not null default 'deposit',   -- deposit | full | remainder
  amount          numeric not null,
  currency        text not null default 'ARS',
  status          text not null default 'pending',   -- pending | approved | rejected | cancelled | refunded
  preference_id   text,
  mp_payment_id   text,
  checkout_url    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_mp_payments_reg on public.mp_payments(registration_id);
create index if not exists idx_mp_payments_pref on public.mp_payments(preference_id);

-- Marca cuándo se pagó la seña (para el badge en Inscripciones).
alter table public.registrations
  add column if not exists deposit_paid_at timestamptz;

alter table public.mp_payments enable row level security;
-- Lectura para staff/admin del club (el edge function usa service role y saltea RLS).
drop policy if exists mp_payments_read on public.mp_payments;
create policy mp_payments_read on public.mp_payments for select
  using ( public.is_superadmin() or public.is_club_member(club_id) );;