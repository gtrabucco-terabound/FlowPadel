-- Fase 1: gestión de profesores y clases individuales.

create table if not exists coaches (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id) on delete cascade,
  name       text not null,
  phone      text,
  email      text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coach_availability (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references coaches(id) on delete cascade,
  weekday       smallint not null check (weekday between 1 and 7),
  start_minutes integer not null,
  end_minutes   integer not null
);

create table if not exists lessons (
  id             uuid primary key default gen_random_uuid(),
  club_id        uuid not null references clubs(id) on delete cascade,
  coach_id       uuid not null references coaches(id) on delete restrict,
  court_id       uuid references courts(id) on delete set null,
  player_id      uuid references players(id) on delete set null,
  customer_name  text,
  customer_phone text,
  lesson_date    date not null,
  start_minutes  integer not null,
  slot_minutes   integer not null default 90,
  status         text not null default 'scheduled',
  kind           text not null default 'individual',
  price          numeric,
  created_at     timestamptz not null default now()
);

create index if not exists lessons_club_date_idx on lessons (club_id, lesson_date);
create index if not exists coach_availability_coach_idx on coach_availability (coach_id);

alter table coaches enable row level security;
drop policy if exists coaches_club on coaches;
create policy coaches_club on coaches for all to authenticated
  using (is_club_member(club_id)) with check (is_club_member(club_id));

alter table coach_availability enable row level security;
drop policy if exists coach_availability_club on coach_availability;
create policy coach_availability_club on coach_availability for all to authenticated
  using (exists (select 1 from coaches c where c.id = coach_id and is_club_member(c.club_id)))
  with check (exists (select 1 from coaches c where c.id = coach_id and is_club_member(c.club_id)));

alter table lessons enable row level security;
drop policy if exists lessons_club on lessons;
create policy lessons_club on lessons for all to authenticated
  using (is_club_member(club_id)) with check (is_club_member(club_id));

alter table plans add column if not exists f_lessons boolean not null default false;
