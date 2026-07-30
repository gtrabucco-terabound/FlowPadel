-- Motor de planes configurable (Base/Silver/Oro) + condición Fundador + config global.

create table if not exists plans (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  badge            text,
  price_amount     numeric,
  currency         text not null default 'ARS',
  period           text not null default 'mes',
  f_reservations   boolean not null default true,
  f_fixed_bookings boolean not null default true,
  f_tournaments    boolean not null default true,
  f_payments_mp    boolean not null default false,
  f_occupancy      boolean not null default false,
  f_whatsapp_bot   boolean not null default false,
  community_scope  text not null default 'club',
  founder_eligible boolean not null default false,
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists platform_settings (
  id                    integer primary key default 1,
  founder_discount_pct  integer not null default 50,
  founder_years         integer not null default 3,
  founder_slots_total   integer not null default 10,
  founder_slots_taken   integer not null default 0,
  roi                   jsonb not null default '[]'::jsonb,
  updated_at            timestamptz not null default now(),
  constraint singleton check (id = 1)
);

alter table clubs
  add column if not exists plan_id   uuid references plans(id) on delete set null,
  add column if not exists is_founder boolean not null default false;

alter table plans enable row level security;
drop policy if exists plans_public_read on plans;
create policy plans_public_read on plans for select to anon, authenticated using (is_active);
drop policy if exists plans_superadmin_all on plans;
create policy plans_superadmin_all on plans for all to authenticated using (is_superadmin()) with check (is_superadmin());

alter table platform_settings enable row level security;
drop policy if exists platform_settings_public_read on platform_settings;
create policy platform_settings_public_read on platform_settings for select to anon, authenticated using (true);
drop policy if exists platform_settings_superadmin_write on platform_settings;
create policy platform_settings_superadmin_write on platform_settings for all to authenticated using (is_superadmin()) with check (is_superadmin());
