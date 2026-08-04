-- B2: categorías en juego + parejas por categoría por club + resultado por categoría.
alter table interclub_ligas add column if not exists categories text[] not null default '{}';

create table if not exists interclub_pairs (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references interclub_teams(id) on delete cascade,
  category   text not null,
  pair_name  text not null,
  created_at timestamptz not null default now(),
  unique (team_id, category)
);

create table if not exists interclub_series_lines (
  id         uuid primary key default gen_random_uuid(),
  series_id  uuid not null references interclub_series(id) on delete cascade,
  category   text not null,
  home_score integer,
  away_score integer,
  created_at timestamptz not null default now(),
  unique (series_id, category)
);

create index if not exists interclub_pairs_team_idx on interclub_pairs(team_id);
create index if not exists interclub_series_lines_series_idx on interclub_series_lines(series_id);

alter table interclub_pairs enable row level security;
alter table interclub_series_lines enable row level security;

drop policy if exists interclub_pairs_club on interclub_pairs;
create policy interclub_pairs_club on interclub_pairs for all to authenticated
  using (exists (
    select 1 from interclub_teams t join interclub_ligas l on l.id = t.liga_id
    where t.id = team_id and is_club_member(l.club_id)))
  with check (exists (
    select 1 from interclub_teams t join interclub_ligas l on l.id = t.liga_id
    where t.id = team_id and is_club_member(l.club_id)));

drop policy if exists interclub_series_lines_club on interclub_series_lines;
create policy interclub_series_lines_club on interclub_series_lines for all to authenticated
  using (exists (
    select 1 from interclub_series s join interclub_ligas l on l.id = s.liga_id
    where s.id = series_id and is_club_member(l.club_id)))
  with check (exists (
    select 1 from interclub_series s join interclub_ligas l on l.id = s.liga_id
    where s.id = series_id and is_club_member(l.club_id)));
