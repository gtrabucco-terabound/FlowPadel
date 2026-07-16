-- Americano: las parejas rotan cada ronda (método del círculo sobre jugadores).
-- Crea equipos efímeros por pareja-ronda y matches sin zona (ranking individual).
create or replace function public.generate_americano(
  p_event_id uuid, p_courts int default 1, p_start_date date default null,
  p_rounds int default null, p_first_hour int default 19, p_slot_minutes int default 90)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_club_id uuid; v_fmt tournament_format; v_start date;
  pl uuid[]; w uuid[]; c uuid[];
  n int; m int; half int; base_rounds int; rounds_to_play int; nc int;
  rr int; i int; g int := 0;
  v_round_id uuid; rdate date; v_sched timestamptz;
  a uuid; b uuid; v_team uuid; tlist uuid[]; k int;
  v_name text; v_created int := 0;
begin
  v_club_id := public._assert_event_access(p_event_id);
  select long_format into v_fmt from public.events where id = p_event_id;
  if v_fmt is distinct from 'americano' then
    raise exception 'generate_americano requiere formato americano (actual: %)', coalesce(v_fmt::text,'null') using errcode='invalid_parameter_value';
  end if;
  select coalesce(p_start_date, start_date::date, current_date) into v_start from public.events where id = p_event_id;

  -- jugadores del evento (desde equipos de inscripción, no efímeros), orden estable
  select array_agg(pid order by pid) into pl from (
    select distinct p.id as pid
    from public.teams tm
    join public.players p on p.id in (tm.player_1_id, tm.player_2_id)
    where tm.event_id = p_event_id and tm.ephemeral = false and p.id is not null
  ) q;
  n := coalesce(array_length(pl,1),0);
  if n < 4 then raise exception 'El americano necesita al menos 4 jugadores (hay %).', n using errcode='invalid_parameter_value'; end if;

  select array_agg(id) into c from (select id from public.courts where club_id=v_club_id and is_active order by name limit greatest(p_courts,1)) q;
  nc := coalesce(array_length(c,1),0);

  delete from public.matches where event_id = p_event_id and phase = 'group_stage';
  delete from public.rounds  where event_id = p_event_id;
  delete from public.teams   where event_id = p_event_id and ephemeral = true;

  w := pl;
  if n % 2 = 1 then w := w || array[null::uuid]; end if;
  m := array_length(w,1); half := m/2; base_rounds := m-1;
  rounds_to_play := greatest(1, least(coalesce(p_rounds, base_rounds), base_rounds));

  for rr in 1..rounds_to_play loop
    rdate := v_start;  -- americano: mismo día, rondas en turnos sucesivos
    insert into public.rounds (event_id, club_id, number, scheduled_date)
      values (p_event_id, v_club_id, rr, rdate) returning id into v_round_id;

    -- parejas de esta ronda (método círculo); crear equipos efímeros
    tlist := array[]::uuid[];
    for i in 1..half loop
      a := w[i]; b := w[m+1-i];
      if a is not null and b is not null then
        select coalesce(full_name,'?') into v_name from public.players where id=a;
        select v_name || ' / ' || coalesce((select full_name from public.players where id=b),'?') into v_name;
        insert into public.teams (event_id, club_id, name, player_1_id, player_2_id, ephemeral)
          values (p_event_id, v_club_id, v_name, a, b, true) returning id into v_team;
        tlist := tlist || v_team;
      end if;
    end loop;

    -- emparejar equipos de a 2 -> un match por cancha (pair1 vs pair2)
    k := 1;
    while k + 1 <= coalesce(array_length(tlist,1),0) loop
      if nc > 0 then
        v_sched := rdate::timestamptz + make_interval(hours => p_first_hour) + make_interval(mins => (g/nc) * p_slot_minutes);
      else
        v_sched := rdate::timestamptz + make_interval(hours => p_first_hour) + make_interval(mins => g * p_slot_minutes);
      end if;
      insert into public.matches (event_id, club_id, phase, status, zone_id, round_id, team_a_id, team_b_id, court_id, scheduled_at)
        values (p_event_id, v_club_id, 'group_stage', 'scheduled', null, v_round_id, tlist[k], tlist[k+1],
                case when nc>0 then c[(g % nc)+1] else null end, v_sched);
      v_created := v_created + 1; g := g + 1; k := k + 2;
    end loop;

    w := array[w[1]] || array[w[m]] || w[2:m-1];
  end loop;

  perform public.recompute_player_standings(p_event_id);
  return v_created;
end;
$$;
revoke all on function public.generate_americano(uuid,int,date,int,int,int) from public;
grant execute on function public.generate_americano(uuid,int,date,int,int,int) to authenticated;;