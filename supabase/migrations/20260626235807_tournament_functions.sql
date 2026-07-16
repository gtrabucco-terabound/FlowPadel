create or replace function public._assert_event_access(p_event_id uuid)
returns uuid language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_club_id uuid;
begin
  select club_id into v_club_id from public.events where id = p_event_id;
  if v_club_id is null then
    raise exception 'Evento % inexistente', p_event_id using errcode = 'no_data_found';
  end if;
  if auth.uid() is not null and not (public.is_club_member(v_club_id) or public.is_superadmin()) then
    raise exception 'No autorizado para operar sobre el evento % (club %)', p_event_id, v_club_id using errcode = 'insufficient_privilege';
  end if;
  return v_club_id;
end;
$$;

create or replace function public.recompute_standings(p_event_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_club_id uuid;
begin
  v_club_id := public._assert_event_access(p_event_id);
  with zt as (
    select z.id as zone_id, zt.team_id, z.club_id
    from public.zones z join public.zone_teams zt on zt.zone_id = z.id
    where z.event_id = p_event_id
  ),
  perspectives as (
    select m.zone_id, m.team_a_id as team_id, m.games_a as gf, m.games_b as ga, (m.winner_team_id = m.team_a_id) as won
    from public.matches m
    where m.event_id = p_event_id and m.phase = 'group_stage' and m.status = 'completed' and m.zone_id is not null and m.team_a_id is not null
    union all
    select m.zone_id, m.team_b_id as team_id, m.games_b as gf, m.games_a as ga, (m.winner_team_id = m.team_b_id) as won
    from public.matches m
    where m.event_id = p_event_id and m.phase = 'group_stage' and m.status = 'completed' and m.zone_id is not null and m.team_b_id is not null
  ),
  agg as (
    select zt.zone_id, zt.team_id, zt.club_id,
      count(p.team_id) as played,
      coalesce(sum((p.won)::int), 0) as won,
      coalesce(sum((not p.won)::int), 0) as lost,
      coalesce(sum(p.gf), 0) as games_for,
      coalesce(sum(p.ga), 0) as games_against
    from zt left join perspectives p on p.zone_id = zt.zone_id and p.team_id = zt.team_id
    group by zt.zone_id, zt.team_id, zt.club_id
  ),
  ranked as (
    select a.*, (3 * a.won + 1 * a.lost) as points, (a.games_for - a.games_against) as games_diff,
      row_number() over (partition by a.zone_id order by (3 * a.won + 1 * a.lost) desc, (a.games_for - a.games_against) desc, a.team_id) as position
    from agg a
  )
  insert into public.standings as s (zone_id, team_id, club_id, played, won, lost, points, games_for, games_against, games_diff, position)
  select r.zone_id, r.team_id, r.club_id, r.played, r.won, r.lost, r.points, r.games_for, r.games_against, r.games_diff, r.position
  from ranked r
  on conflict (zone_id, team_id) do update set
    played = excluded.played, won = excluded.won, lost = excluded.lost, points = excluded.points,
    games_for = excluded.games_for, games_against = excluded.games_against, games_diff = excluded.games_diff,
    position = excluded.position, updated_at = now();
end;
$$;

create or replace function public.generate_group_matches(p_event_id uuid)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_club_id uuid; v_created integer := 0;
begin
  v_club_id := public._assert_event_access(p_event_id);
  with pairs as (
    select z.id as zone_id, z.club_id as club_id, a.team_id as team_a_id, b.team_id as team_b_id
    from public.zones z
    join public.zone_teams a on a.zone_id = z.id
    join public.zone_teams b on b.zone_id = z.id and b.team_id > a.team_id
    where z.event_id = p_event_id
  ),
  to_create as (
    select p.* from pairs p
    where not exists (
      select 1 from public.matches m
      where m.zone_id = p.zone_id and m.phase = 'group_stage'
        and ((m.team_a_id = p.team_a_id and m.team_b_id = p.team_b_id) or (m.team_a_id = p.team_b_id and m.team_b_id = p.team_a_id))
    )
  ),
  ins as (
    insert into public.matches (event_id, club_id, phase, status, zone_id, team_a_id, team_b_id)
    select p_event_id, c.club_id, 'group_stage', 'scheduled', c.zone_id, c.team_a_id, c.team_b_id
    from to_create c returning 1
  )
  select count(*) into v_created from ins;
  return v_created;
end;
$$;

create or replace function public._resolve_first_round_byes(p_bracket_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare rec record; v_winner uuid;
begin
  for rec in
    select id, team_a_id, team_b_id, bracket_slot, next_match_id
    from public.matches
    where bracket_id = p_bracket_id and bracket_round = 1 and (team_a_id is null) <> (team_b_id is null)
  loop
    v_winner := coalesce(rec.team_a_id, rec.team_b_id);
    update public.matches set winner_team_id = v_winner, status = 'walkover' where id = rec.id;
    if rec.next_match_id is not null then
      if rec.bracket_slot % 2 = 1 then
        update public.matches set team_a_id = v_winner where id = rec.next_match_id;
      else
        update public.matches set team_b_id = v_winner where id = rec.next_match_id;
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.generate_bracket(p_event_id uuid, p_qualifiers_per_zone int default 2)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_club_id uuid; v_bracket_id uuid; v_k integer; v_size integer; v_rounds integer; v_first_cnt integer; r integer; v_phase match_phase;
begin
  v_club_id := public._assert_event_access(p_event_id);
  if p_qualifiers_per_zone < 1 then
    raise exception 'p_qualifiers_per_zone debe ser >= 1 (recibido %)', p_qualifiers_per_zone using errcode = 'invalid_parameter_value';
  end if;
  create temporary table _qual on commit drop as
  with topn as (
    select s.team_id, s.points, s.games_diff
    from public.standings s join public.zones z on z.id = s.zone_id
    where z.event_id = p_event_id and s.position <= p_qualifiers_per_zone and s.position is not null
  )
  select t.team_id, row_number() over (order by t.points desc, t.games_diff desc, t.team_id)::int as seed from topn t;
  select count(*) into v_k from _qual;
  if v_k < 2 then
    raise exception 'Clasificados insuficientes para armar bracket (% encontrados). Standings calculadas?', v_k using errcode = 'invalid_parameter_value';
  end if;
  v_size := 1;
  while v_size < v_k loop v_size := v_size * 2; end loop;
  v_rounds := (ln(v_size) / ln(2))::int;
  v_first_cnt := v_size / 2;
  update public.teams set seed = null where event_id = p_event_id;
  update public.teams t set seed = q.seed from _qual q where t.id = q.team_id;
  delete from public.matches where event_id = p_event_id and phase in ('round_of_16','quarter_final','semi_final','third_place','final');
  delete from public.brackets where event_id = p_event_id;
  insert into public.brackets (event_id, club_id, type, size) values (p_event_id, v_club_id, 'single_elimination', v_size) returning id into v_bracket_id;
  create temporary table _slots on commit drop as
  with recursive levels(level, round_size, pos, seed) as (
    select 0, 1, 1, 1
    union all
    select l.level + 1, l.round_size * 2,
      case when g.k = 1 then l.pos * 2 - 1 else l.pos * 2 end,
      case when g.k = 1 then l.seed else l.round_size * 2 + 1 - l.seed end
    from levels l cross join (values (1), (2)) as g(k)
    where l.round_size < v_size
  )
  select pos, seed from levels where round_size = v_size;
  create temporary table _bracketpos on commit drop as
  select sl.pos, q.team_id from _slots sl left join _qual q on q.seed = sl.seed;
  create temporary table _rmatch (round int, slot int, match_id uuid) on commit drop;
  for r in 1..v_rounds loop
    v_phase := case (v_rounds - r)
                 when 0 then 'final'::match_phase
                 when 1 then 'semi_final'::match_phase
                 when 2 then 'quarter_final'::match_phase
                 else 'round_of_16'::match_phase end;
    insert into public.matches (event_id, club_id, phase, status, bracket_id, bracket_round, bracket_slot)
    select p_event_id, v_club_id, v_phase, 'scheduled', v_bracket_id, r, g.slot
    from generate_series(1, v_size / (2 ^ r)::int) as g(slot);
    insert into _rmatch (round, slot, match_id)
    select bracket_round, bracket_slot, id from public.matches where bracket_id = v_bracket_id and bracket_round = r;
  end loop;
  update public.matches m set next_match_id = nxt.match_id
    from _rmatch cur join _rmatch nxt on nxt.round = cur.round + 1 and nxt.slot = ((cur.slot + 1) / 2)
   where m.bracket_id = v_bracket_id and m.bracket_round = cur.round and m.bracket_slot = cur.slot;
  update public.matches m set team_a_id = pa.team_id, team_b_id = pb.team_id
    from _rmatch rm
    left join _bracketpos pa on pa.pos = rm.slot * 2 - 1
    left join _bracketpos pb on pb.pos = rm.slot * 2
   where m.bracket_id = v_bracket_id and rm.round = 1 and m.bracket_round = 1 and m.bracket_slot = rm.slot;
  perform public._resolve_first_round_byes(v_bracket_id);
  return v_bracket_id;
end;
$$;

create or replace function public.apply_elo_for_match(p_match_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  m record; v_team_a_rating numeric; v_team_b_rating numeric; v_exp_a numeric; v_exp_b numeric; v_k constant int := 32; rec record;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'Match % inexistente', p_match_id using errcode = 'no_data_found'; end if;
  perform public._assert_event_access(m.event_id);
  if exists (select 1 from public.elo_history where match_id = p_match_id) then return; end if;
  if m.winner_team_id is null then
    raise exception 'Match % sin ganador; no se puede aplicar ELO', p_match_id using errcode = 'check_violation';
  end if;
  if not m.is_rated then return; end if;
  select avg(p.elo_rating)::numeric into v_team_a_rating from public.teams t join public.players p on p.id = t.player_1_id or p.id = t.player_2_id where t.id = m.team_a_id;
  select avg(p.elo_rating)::numeric into v_team_b_rating from public.teams t join public.players p on p.id = t.player_1_id or p.id = t.player_2_id where t.id = m.team_b_id;
  if v_team_a_rating is null or v_team_b_rating is null then
    raise exception 'Match %: equipos sin jugadores con rating; no se aplica ELO', p_match_id using errcode = 'check_violation';
  end if;
  v_exp_a := 1.0 / (1.0 + power(10.0, (v_team_b_rating - v_team_a_rating) / 400.0));
  v_exp_b := 1.0 / (1.0 + power(10.0, (v_team_a_rating - v_team_b_rating) / 400.0));
  for rec in
    select p.id as player_id, p.elo_rating as rating_before,
      case when t.id = m.team_a_id then v_exp_a else v_exp_b end as expected,
      case when t.id = m.winner_team_id then 1.0 else 0.0 end as score
    from public.teams t join public.players p on p.id = t.player_1_id or p.id = t.player_2_id
    where t.id in (m.team_a_id, m.team_b_id)
  loop
    declare v_delta int := round(v_k * (rec.score - rec.expected)); v_after int := rec.rating_before + v_delta;
    begin
      insert into public.elo_history (player_id, match_id, rating_before, rating_after, delta)
      values (rec.player_id, p_match_id, rec.rating_before, v_after, v_delta);
      update public.players set elo_rating = v_after, matches_played = matches_played + 1,
        matches_won = matches_won + (case when rec.score = 1.0 then 1 else 0 end)
       where id = rec.player_id;
    end;
  end loop;
end;
$$;

create or replace function public.submit_match_result(p_match_id uuid, p_games_a int, p_games_b int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare m record; v_winner uuid;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'Match % inexistente', p_match_id using errcode = 'no_data_found'; end if;
  perform public._assert_event_access(m.event_id);
  if p_games_a = p_games_b then raise exception 'No se admite empate (games_a = games_b = %)', p_games_a using errcode = 'check_violation'; end if;
  if m.team_a_id is null or m.team_b_id is null then raise exception 'El match % no tiene ambos equipos asignados', p_match_id using errcode = 'check_violation'; end if;
  v_winner := case when p_games_a > p_games_b then m.team_a_id else m.team_b_id end;
  update public.matches set games_a = p_games_a, games_b = p_games_b, winner_team_id = v_winner, status = 'completed' where id = p_match_id;
  if m.phase = 'group_stage' then perform public.recompute_standings(m.event_id); end if;
  if m.bracket_id is not null and m.next_match_id is not null then
    if m.bracket_slot % 2 = 1 then
      update public.matches set team_a_id = v_winner where id = m.next_match_id;
    else
      update public.matches set team_b_id = v_winner where id = m.next_match_id;
    end if;
  end if;
  if m.is_rated then perform public.apply_elo_for_match(p_match_id); end if;
end;
$$;

revoke all on function public._assert_event_access(uuid) from public;
revoke all on function public._resolve_first_round_byes(uuid) from public;
revoke all on function public.recompute_standings(uuid) from public;
revoke all on function public.generate_group_matches(uuid) from public;
revoke all on function public.generate_bracket(uuid, int) from public;
revoke all on function public.submit_match_result(uuid, int, int) from public;
revoke all on function public.apply_elo_for_match(uuid) from public;
grant execute on function public.recompute_standings(uuid) to authenticated;
grant execute on function public.generate_group_matches(uuid) to authenticated;
grant execute on function public.generate_bracket(uuid, int) to authenticated;
grant execute on function public.submit_match_result(uuid, int, int) to authenticated;
grant execute on function public.apply_elo_for_match(uuid) to authenticated;;