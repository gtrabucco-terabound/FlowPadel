-- Solicitudes de demo desde la landing comercial (inicio del funnel de clubes).
create table if not exists demo_requests (
  id           uuid primary key default gen_random_uuid(),
  club_name    text not null,
  contact_name text not null,
  email        text,
  phone        text,
  message      text,
  source       text not null default 'landing',
  status       text not null default 'new',
  created_at   timestamptz not null default now()
);

alter table demo_requests enable row level security;

drop policy if exists demo_requests_public_insert on demo_requests;
create policy demo_requests_public_insert on demo_requests
  for insert to anon, authenticated with check (true);

drop policy if exists demo_requests_superadmin_select on demo_requests;
create policy demo_requests_superadmin_select on demo_requests
  for select to authenticated using (is_superadmin());
