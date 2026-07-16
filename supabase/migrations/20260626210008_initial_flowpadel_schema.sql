create extension if not exists "pgcrypto";
create extension if not exists "citext";

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create type app_role        as enum ('superadmin', 'club_admin', 'staff', 'player');
create type club_member_role as enum ('club_admin', 'staff');

create type event_type      as enum ('tournament', 'open_play');
create type event_status    as enum ('draft', 'open', 'in_progress', 'closed', 'cancelled');

create type registration_status as enum ('pending', 'approved', 'rejected', 'waitlist', 'cancelled');

create type match_phase     as enum ('open_play', 'group_stage', 'round_of_16',
                                     'quarter_final', 'semi_final', 'third_place', 'final');
create type match_status    as enum ('scheduled', 'in_progress', 'completed', 'walkover', 'cancelled');

create type bracket_type    as enum ('single_elimination');

create type payment_status  as enum ('pending', 'paid', 'failed', 'refunded', 'cancelled');
create type payment_provider as enum ('cash', 'mercadopago', 'stripe', 'transfer', 'other');

create table clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        citext not null unique,
  city        text,
  address     text,
  phone       text,
  logo_url    text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table clubs is 'Tenant root. Each club is an isolated tenant; club_id on child tables drives RLS.';

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        citext not null unique,
  full_name    text,
  avatar_url   text,
  global_role  app_role not null default 'player',
  player_id    uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table profiles is 'Auth-backed person. global_role is platform scope; per-club role is in club_members. No email hardcoding.';

create table club_members (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  role        club_member_role not null default 'staff',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (club_id, profile_id)
);
comment on table club_members is 'M:N membership with role. Core of RLS.';

create table players (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references profiles(id) on delete set null,
  full_name     text not null,
  phone         text,
  email         citext,
  home_club_id  uuid references clubs(id) on delete set null,
  elo_rating    integer not null default 1000,
  matches_played integer not null default 0,
  matches_won    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table players is 'Global community player. Persists across events; carries ELO and aggregate stats.';

alter table profiles
  add constraint profiles_player_id_fkey
  foreign key (player_id) references players(id) on delete set null;

create table elo_history (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references players(id) on delete cascade,
  match_id      uuid,
  rating_before integer not null,
  rating_after  integer not null,
  delta         integer not null,
  created_at    timestamptz not null default now()
);
comment on table elo_history is 'Append-only ELO ledger; one row per player per rated match.';

create table categories (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (club_id, name)
);
comment on table categories is 'Per-club playing levels/divisions used to segment events.';

create table courts (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (club_id, name)
);
comment on table courts is 'Physical court for scheduling.';

create table events (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references clubs(id) on delete cascade,
  category_id     uuid references categories(id) on delete set null,
  name            text not null,
  slug            citext not null,
  event_type      event_type not null,
  status          event_status not null default 'draft',
  public_visible  boolean not null default false,
  description     text,
  start_date      timestamptz,
  end_date        timestamptz,
  max_teams       integer,
  registration_fee numeric(10,2) not null default 0,
  currency        char(3) not null default 'ARS',
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (club_id, slug)
);
comment on table events is 'Tournament or open-play. Tenant-scoped (club_id).';

create table registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  club_id       uuid not null references clubs(id) on delete cascade,
  status        registration_status not null default 'pending',
  player_1_id   uuid references players(id) on delete set null,
  player_2_id   uuid references players(id) on delete set null,
  player_1_name text not null,
  player_1_phone text,
  player_2_name text,
  player_2_phone text,
  waitlist_position integer,
  team_id       uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table registrations is 'Public-insert / admin-approve entry request.';

create table teams (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  club_id       uuid not null references clubs(id) on delete cascade,
  name          text,
  player_1_id   uuid references players(id) on delete set null,
  player_2_id   uuid references players(id) on delete set null,
  seed          integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table teams is 'Competing pair within an event.';

alter table registrations
  add constraint registrations_team_id_fkey
  foreign key (team_id) references teams(id) on delete set null;

create table zones (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  club_id     uuid not null references clubs(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, name)
);
comment on table zones is 'Group-stage group.';

create table zone_teams (
  zone_id   uuid not null references zones(id) on delete cascade,
  team_id   uuid not null references teams(id) on delete cascade,
  primary key (zone_id, team_id)
);
comment on table zone_teams is 'Membership of teams in group-stage zones.';

create table brackets (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  club_id     uuid not null references clubs(id) on delete cascade,
  type        bracket_type not null default 'single_elimination',
  size        integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id)
);
comment on table brackets is 'Elimination tree for an event.';

create table matches (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  club_id         uuid not null references clubs(id) on delete cascade,
  phase           match_phase not null default 'open_play',
  status          match_status not null default 'scheduled',
  zone_id         uuid references zones(id) on delete set null,
  bracket_id      uuid references brackets(id) on delete set null,
  bracket_round   integer,
  bracket_slot    integer,
  next_match_id   uuid references matches(id) on delete set null,
  team_a_id       uuid references teams(id) on delete set null,
  team_b_id       uuid references teams(id) on delete set null,
  games_a         integer,
  games_b         integer,
  winner_team_id  uuid references teams(id) on delete set null,
  court_id        uuid references courts(id) on delete set null,
  scheduled_at    timestamptz,
  is_rated        boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table matches is 'Single game across all phases.';

alter table elo_history
  add constraint elo_history_match_id_fkey
  foreign key (match_id) references matches(id) on delete set null;

create table standings (
  id            uuid primary key default gen_random_uuid(),
  zone_id       uuid not null references zones(id) on delete cascade,
  team_id       uuid not null references teams(id) on delete cascade,
  club_id       uuid not null references clubs(id) on delete cascade,
  played        integer not null default 0,
  won           integer not null default 0,
  lost          integer not null default 0,
  points        integer not null default 0,
  games_for     integer not null default 0,
  games_against integer not null default 0,
  games_diff    integer not null default 0,
  position      integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (zone_id, team_id)
);
comment on table standings is 'Materialized group-stage table.';

create table payments (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references clubs(id) on delete cascade,
  event_id        uuid not null references events(id) on delete cascade,
  registration_id uuid references registrations(id) on delete set null,
  payer_player_id uuid references players(id) on delete set null,
  amount          numeric(10,2) not null,
  currency        char(3) not null default 'ARS',
  status          payment_status not null default 'pending',
  provider        payment_provider not null default 'cash',
  provider_ref    text,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table payments is 'Registration-fee charge. Provider-agnostic.';

do $$
declare t text;
begin
  foreach t in array array[
    'clubs','profiles','club_members','players','categories','courts',
    'events','registrations','teams','zones','brackets','matches',
    'standings','payments'
  ] loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on %1$s
       for each row execute function set_updated_at();', t);
  end loop;
end $$;

create index idx_club_members_profile      on club_members(profile_id);
create index idx_club_members_club          on club_members(club_id);
create index idx_players_profile            on players(profile_id);
create index idx_players_home_club          on players(home_club_id);
create index idx_players_elo                on players(elo_rating desc);
create index idx_elo_history_player         on elo_history(player_id, created_at);
create index idx_categories_club            on categories(club_id);
create index idx_courts_club                on courts(club_id);
create index idx_events_club_status         on events(club_id, status);
create index idx_events_public              on events(public_visible) where public_visible;
create index idx_registrations_event        on registrations(event_id);
create index idx_registrations_club         on registrations(club_id);
create index idx_registrations_status       on registrations(event_id, status);
create index idx_teams_event                on teams(event_id);
create index idx_teams_club                 on teams(club_id);
create index idx_zones_event                on zones(event_id);
create index idx_zone_teams_team            on zone_teams(team_id);
create index idx_brackets_event             on brackets(event_id);
create index idx_matches_event              on matches(event_id);
create index idx_matches_club               on matches(club_id);
create index idx_matches_zone               on matches(zone_id);
create index idx_matches_bracket            on matches(bracket_id);
create index idx_matches_schedule           on matches(court_id, scheduled_at);
create index idx_matches_team_a             on matches(team_a_id);
create index idx_matches_team_b             on matches(team_b_id);
create index idx_standings_zone             on standings(zone_id, position);
create index idx_payments_event             on payments(event_id);
create index idx_payments_registration      on payments(registration_id);;