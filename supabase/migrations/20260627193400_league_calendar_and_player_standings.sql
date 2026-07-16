create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  number integer not null,
  scheduled_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, number)
);
comment on table public.rounds is 'Jornada (fecha) de una liga larga: agrupa los partidos de esa semana.';

alter table public.matches add column if not exists round_id uuid references public.rounds(id) on delete set null;
create index if not exists idx_matches_round on public.matches(round_id);
create index if not exists idx_rounds_event on public.rounds(event_id, number);

create table if not exists public.player_standings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  played integer not null default 0,
  won integer not null default 0,
  lost integer not null default 0,
  points integer not null default 0,
  position integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, player_id)
);
comment on table public.player_standings is 'Ranking individual por jugador dentro de un evento.';
create index if not exists idx_player_standings_event on public.player_standings(event_id, position);

create trigger trg_rounds_updated_at before update on public.rounds for each row execute function public.set_updated_at();
create trigger trg_player_standings_updated_at before update on public.player_standings for each row execute function public.set_updated_at();

alter table public.rounds enable row level security;
alter table public.player_standings enable row level security;

create policy rounds_select_member on public.rounds for select to authenticated using (public.is_club_member(club_id) or public.is_superadmin());
create policy rounds_select_public on public.rounds for select to anon, authenticated using (exists (select 1 from public.events e where e.id = rounds.event_id and e.public_visible = true));
create policy rounds_write_staff on public.rounds for all to authenticated using (public.is_club_member(club_id) or public.is_superadmin()) with check (public.is_club_member(club_id) or public.is_superadmin());

create policy pstand_select_member on public.player_standings for select to authenticated using (public.is_club_member(club_id) or public.is_superadmin());
create policy pstand_select_public on public.player_standings for select to anon, authenticated using (exists (select 1 from public.events e where e.id = player_standings.event_id and e.public_visible = true));
create policy pstand_write_staff on public.player_standings for all to authenticated using (public.is_club_member(club_id) or public.is_superadmin()) with check (public.is_club_member(club_id) or public.is_superadmin());

create or replace function public.recompute_player_standings(p_event_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_club_id uuid;
begin
  v_club_id := public._assert_event_access(p_event_id);
  with parts as (
    select p.id as player_id, (m.winner_team_id = tm.id) as won
    from public.matches m
    join public.teams tm on tm.id in (m.team_a_id, m.team_b_id)
    join public.players p on p.id in (tm.player_1_id, tm.player_2_id)
    where m.event_id = p_event_id and m.status = 'completed' and m.winner_team_id is not null
  ),
  agg as (
    select player_id, count(*) as played,
           coalesce(sum((won)::int),0) as won, coalesce(sum((not won)::int),0) as lost
    from parts group by player_id
  ),
  ranked as (
    select a.*, (3*a.won + 1*a.lost) as points,
           row_number() over (order by (3*a.won+1*a.lost) desc, a.won desc, a.player_id) as position
    from agg a
  )
  insert into public.player_standings as s (event_id, club_id, player_id, played, won, lost, points, position)
  select p_event_id, v_club_id, r.player_id, r.played, r.won, r.lost, r.points, r.position
  from ranked r
  on conflict (event_id, player_id) do update set
    played=excluded.played, won=excluded.won, lost=excluded.lost,
    points=excluded.points, position=excluded.position, updated_at=now();
end;
$$;

create or replace function public.generate_league(
  p_event_id uuid, p_courts int default 1, p_start_date date default null,
  p_slot_minutes int default 90, p_first_hour int default 19, p_slots_per_court int default 1)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_club_id uuid; v_fmt tournament_format; v_start date; v_zone_id uuid;
  t uuid[]; w uuid[]; c uuid[];
  n int; m int; half int; base_rounds int; legs int; nc int;
  rr int; leg int; rnum int; i int; j int;
  v_round_id uuid; rdate date; v_sched timestamptz;
  a uuid; b uuid; ta uuid; tb uuid; v_created int := 0;
begin
  v_club_id := public._assert_event_access(p_event_id);
  select long_format into v_fmt from public.events where id = p_event_id;
  if v_fmt is null or v_fmt = 'americano' then
    raise exception 'generate_league requiere formato de liga. Formato actual: %', coalesce(v_fmt::text,'null') using errcode='invalid_parameter_value';
  end if;
  select coalesce(p_start_date, start_date::date, current_date) into v_start from public.events where id = p_event_id;
  select array_agg(id order by created_at, id) into t from public.teams where event_id = p_event_id;
  n := coalesce(array_length(t,1),0);
  if n < 2 then raise exception 'Se necesitan al menos 2 equipos (hay %).', n using errcode='invalid_parameter_value'; end if;
  select array_agg(id) into c from (select id from public.courts where club_id = v_club_id and is_active order by name limit greatest(p_courts,1)) q;
  nc := coalesce(array_length(c,1),0);
  delete from public.matches where event_id = p_event_id and phase = 'group_stage';
  delete from public.rounds where event_id = p_event_id;
  delete from public.zones where event_id = p_event_id and name = 'Liga';
  insert into public.zones (event_id, club_id, name) values (p_event_id, v_club_id, 'Liga') returning id into v_zone_id;
  insert into public.zone_teams (zone_id, team_id) select v_zone_id, unnest(t);
  w := t;
  if n % 2 = 1 then w := w || array[null::uuid]; end if;
  m := array_length(w,1); half := m/2; base_rounds := m-1;
  legs := case when v_fmt = 'liga_ida_vuelta' then 2 else 1 end;
  for rr in 1..base_rounds loop
    for leg in 1..legs loop
      rnum := (leg-1)*base_rounds + rr;
      rdate := v_start + ((rnum-1)*7);
      insert into public.rounds (event_id, club_id, number, scheduled_date) values (p_event_id, v_club_id, rnum, rdate) returning id into v_round_id;
      j := 0;
      for i in 1..half loop
        a := w[i]; b := w[m+1-i];
        if a is not null and b is not null then
          if leg = 2 then ta := b; tb := a; else ta := a; tb := b; end if;
          if nc > 0 then
            v_sched := rdate::timestamptz + make_interval(hours => p_first_hour) + make_interval(mins => (j/nc) * p_slot_minutes);
          else
            v_sched := rdate::timestamptz + make_interval(hours => p_first_hour) + make_interval(mins => j * p_slot_minutes);
          end if;
          insert into public.matches (event_id, club_id, phase, status, zone_id, round_id, team_a_id, team_b_id, court_id, scheduled_at)
          values (p_event_id, v_club_id, 'group_stage', 'scheduled', v_zone_id, v_round_id, ta, tb, case when nc>0 then c[(j % nc)+1] else null end, v_sched);
          v_created := v_created + 1; j := j + 1;
        end if;
      end loop;
    end loop;
    w := array[w[1]] || array[w[m]] || w[2:m-1];
  end loop;
  perform public.recompute_standings(p_event_id);
  perform public.recompute_player_standings(p_event_id);
  return v_created;
end;
$$;

revoke all on function public.recompute_player_standings(uuid) from public;
revoke all on function public.generate_league(uuid,int,date,int,int,int) from public;
grant execute on function public.recompute_player_standings(uuid) to authenticated;
grant execute on function public.generate_league(uuid,int,date,int,int,int) to authenticated;;