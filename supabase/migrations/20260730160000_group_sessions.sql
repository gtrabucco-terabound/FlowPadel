-- Fase 3: sesiones de entrenamiento grupal (Caso A).
create table if not exists group_sessions (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references clubs(id) on delete cascade,
  coach_id         uuid not null references coaches(id) on delete restrict,
  court_id         uuid references courts(id) on delete set null,
  session_date     date not null,
  start_minutes    integer not null,
  slot_minutes     integer not null default 90,
  num_slots        integer not null default 1,
  capacity         integer not null default 4,
  min_participants integer not null default 3,
  price_per_person numeric,
  status           text not null default 'open',
  created_at       timestamptz not null default now()
);

create table if not exists group_participants (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references group_sessions(id) on delete cascade,
  player_id      uuid references players(id) on delete set null,
  customer_name  text not null,
  customer_phone text,
  status         text not null default 'joined',
  created_at     timestamptz not null default now()
);

create index if not exists group_sessions_club_date_idx on group_sessions (club_id, session_date);
create index if not exists group_participants_session_idx on group_participants (session_id);

alter table group_sessions enable row level security;
drop policy if exists group_sessions_club on group_sessions;
create policy group_sessions_club on group_sessions for all to authenticated
  using (is_club_member(club_id)) with check (is_club_member(club_id));
drop policy if exists group_sessions_public_open on group_sessions;
create policy group_sessions_public_open on group_sessions for select to anon
  using (status = 'open');

alter table group_participants enable row level security;
drop policy if exists group_participants_club on group_participants;
create policy group_participants_club on group_participants for all to authenticated
  using (exists (select 1 from group_sessions g where g.id = session_id and is_club_member(g.club_id)))
  with check (exists (select 1 from group_sessions g where g.id = session_id and is_club_member(g.club_id)));
