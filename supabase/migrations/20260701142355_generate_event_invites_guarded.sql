create or replace function public.generate_event_invites(p_event_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_ev record; v_count integer;
begin
  select id, modality, category_system, category_value, club_id
    into v_ev from events where id = p_event_id;
  if not found then return 0; end if;

  -- Solo staff/admin del club (o superadmin) puede disparar invitaciones
  if not (public.is_superadmin() or public.is_club_member(v_ev.club_id)) then
    raise exception 'no autorizado';
  end if;

  with eligible as (
    select p.id as player_id
    from players p
    where p.notify_enabled = true
      and p.gender is not null
      and (
        v_ev.modality = 'combinado'
        or (v_ev.modality = 'caballeros' and p.gender = 'male')
        or (v_ev.modality = 'damas'      and p.gender = 'female')
        or (v_ev.modality = 'mixto'      and p.notify_mixto = true)
      )
      and (
        v_ev.category_system is distinct from 'category'
        or v_ev.category_value is null
        or p.category = v_ev.category_value
      )
      and not exists (
        select 1 from team_players tp
        join teams t on t.id = tp.team_id
        where t.event_id = p_event_id and tp.player_id = p.id
      )
  )
  insert into tournament_invites (event_id, player_id, channel, status, reason)
  select p_event_id, player_id, 'email', 'queued', 'auto:modality='||v_ev.modality
  from eligible
  on conflict (event_id, player_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function public.generate_event_invites(uuid) to authenticated;;