-- Liga Interclub (por equipos/clubes): todos contra todos → series club vs club.
create table if not exists interclub_ligas (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id) on delete cascade,
  name       text not null,
  status     text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists interclub_teams (
  id         uuid primary key default gen_random_uuid(),
  liga_id    uuid not null references interclub_ligas(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists interclub_series (
  id            uuid primary key default gen_random_uuid(),
  liga_id       uuid not null references interclub_ligas(id) on delete cascade,
  home_team_id  uuid not null references interclub_teams(id) on delete cascade,
  away_team_id  uuid not null references interclub_teams(id) on delete cascade,
  home_cats_won integer,
  away_cats_won integer,
  status        text not null default 'scheduled',
  created_at    timestamptz not null default now()
);

create index if not exists interclub_teams_liga_idx on interclub_teams(liga_id);
create index if not exists interclub_series_liga_idx on interclub_series(liga_id);

alter table interclub_ligas enable row level security;
alter table interclub_teams enable row level security;
alter table interclub_series enable row level security;

drop policy if exists interclub_ligas_club on interclub_ligas;
create policy interclub_ligas_club on interclub_ligas for all to authenticated
  using (is_club_member(club_id)) with check (is_club_member(club_id));

drop policy if exists interclub_teams_club on interclub_teams;
create policy interclub_teams_club on interclub_teams for all to authenticated
  using (exists (select 1 from interclub_ligas l where l.id = liga_id and is_club_member(l.club_id)))
  with check (exists (select 1 from interclub_ligas l where l.id = liga_id and is_club_member(l.club_id)));

drop policy if exists interclub_series_club on interclub_series;
create policy interclub_series_club on interclub_series for all to authenticated
  using (exists (select 1 from interclub_ligas l where l.id = liga_id and is_club_member(l.club_id)))
  with check (exists (select 1 from interclub_ligas l where l.id = liga_id and is_club_member(l.club_id)));
