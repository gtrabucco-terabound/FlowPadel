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
  if m.phase = 'group_stage' then
    perform public.recompute_standings(m.event_id);
    perform public.recompute_player_standings(m.event_id);
  end if;
  if m.bracket_id is not null and m.next_match_id is not null then
    if m.bracket_slot % 2 = 1 then
      update public.matches set team_a_id = v_winner where id = m.next_match_id;
    else
      update public.matches set team_b_id = v_winner where id = m.next_match_id;
    end if;
  end if;
  if m.is_rated then perform public.apply_elo_for_match(p_match_id); end if;
end;
$$;;