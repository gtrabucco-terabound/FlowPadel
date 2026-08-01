-- Fase 3b: RPCs del bot para entrenamientos grupales.

create or replace function bot_group_options(p_slug text, p_date date)
returns jsonb language sql security definer set search_path=public as $$
  with cl as (select id from clubs where slug = p_slug and is_active)
  select coalesce(jsonb_agg(jsonb_build_object(
    'session_id', g.id,
    'coach_name', (select name from coaches where id = g.coach_id),
    'court_name', (select name from courts where id = g.court_id),
    'start_minutes', g.start_minutes,
    'num_slots', g.num_slots,
    'price_per_person', g.price_per_person,
    'spots_left', g.capacity - (select count(*) from group_participants p where p.session_id = g.id and p.status <> 'cancelled')
  ) order by g.start_minutes)
  filter (where g.capacity - (select count(*) from group_participants p where p.session_id = g.id and p.status <> 'cancelled') > 0),
  '[]'::jsonb)
  from group_sessions g
  where g.club_id = (select id from cl) and g.session_date = p_date and g.status = 'open';
$$;

create or replace function bot_join_group(p_session_id uuid, p_name text, p_phone text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_cap int; v_min int; v_count int; v_coach_name text; v_coach_phone text; v_status text;
begin
  select g.capacity, g.min_participants, g.status, c.name, c.phone
    into v_cap, v_min, v_status, v_coach_name, v_coach_phone
    from group_sessions g left join coaches c on c.id = g.coach_id
    where g.id = p_session_id;
  if not found or v_status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'El grupo no está disponible.');
  end if;
  if length(coalesce(trim(p_name), '')) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Falta el nombre.');
  end if;

  select count(*) into v_count from group_participants where session_id = p_session_id and status <> 'cancelled';
  if v_count >= v_cap then
    return jsonb_build_object('ok', false, 'error', 'El grupo ya está completo.');
  end if;

  insert into group_participants (session_id, customer_name, customer_phone)
  values (p_session_id, trim(p_name), nullif(trim(p_phone), ''));
  v_count := v_count + 1;

  if v_count >= v_min then
    update group_sessions set status = 'confirmed' where id = p_session_id and status = 'open';
  end if;

  return jsonb_build_object('ok', true, 'spots_left', v_cap - v_count,
    'confirmed', v_count >= v_min, 'coach_name', v_coach_name, 'coach_phone', v_coach_phone);
end;
$$;

grant execute on function bot_group_options(text, date) to anon, authenticated;
grant execute on function bot_join_group(uuid, text, text) to anon, authenticated;
