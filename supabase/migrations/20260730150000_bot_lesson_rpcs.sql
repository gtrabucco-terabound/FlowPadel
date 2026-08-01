-- Fase 2: RPCs que usa el bot de WhatsApp para reservar clases.

create or replace function bot_lesson_options(p_slug text, p_date date)
returns jsonb language sql security definer set search_path=public as $$
  with cl as (select id from clubs where slug = p_slug and is_active),
  wd as (
    select case when extract(isodow from p_date)::int = 0 then 7
                else extract(isodow from p_date)::int end as weekday
  ),
  slots as (
    select c.id as coach_id, c.name as coach_name, gs as start_minutes
    from coaches c
    join coach_availability a on a.coach_id = c.id and a.weekday = (select weekday from wd)
    cross join lateral generate_series(a.start_minutes, a.end_minutes - 90, 90) as gs
    where c.club_id = (select id from cl) and c.active
  ),
  free_coach as (
    select s.* from slots s
    where not exists (
      select 1 from lessons l
      where l.coach_id = s.coach_id and l.lesson_date = p_date and l.status <> 'cancelled'
        and s.start_minutes < l.start_minutes + l.slot_minutes
        and s.start_minutes + 90 > l.start_minutes
    )
  ),
  with_court as (
    select fc.coach_id, fc.coach_name, fc.start_minutes,
      (select co.id from courts co
       where co.club_id = (select id from cl) and co.is_active
         and (co.operating_days is null or (select weekday from wd) = any(co.operating_days))
         and co.open_hour * 60 <= fc.start_minutes
         and co.close_hour * 60 >= fc.start_minutes + 90
         and not exists (
           select 1 from court_bookings b
           where b.court_id = co.id and b.booking_date = p_date and b.status <> 'cancelled'
             and fc.start_minutes < b.start_minutes + b.slot_minutes
             and fc.start_minutes + 90 > b.start_minutes
         )
       order by co.number nulls last limit 1) as court_id
    from free_coach fc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'coach_id', wc.coach_id, 'coach_name', wc.coach_name,
    'start_minutes', wc.start_minutes, 'court_id', wc.court_id,
    'court_name', (select name from courts where id = wc.court_id)
  ) order by wc.start_minutes) filter (where wc.court_id is not null), '[]'::jsonb)
  from with_court wc;
$$;

create or replace function bot_book_lesson(
  p_slug text, p_coach_id uuid, p_court_id uuid, p_date date, p_start int, p_name text, p_phone text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_club uuid; v_coach_name text; v_coach_phone text; v_court_name text; v_lesson uuid;
begin
  select id into v_club from clubs where slug = p_slug and is_active;
  if v_club is null then return jsonb_build_object('ok', false, 'error', 'Club no disponible.'); end if;

  select name, phone into v_coach_name, v_coach_phone
    from coaches where id = p_coach_id and club_id = v_club and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'Profe no disponible.'); end if;

  if length(coalesce(trim(p_name), '')) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Falta el nombre del alumno.');
  end if;

  if exists (
    select 1 from lessons where coach_id = p_coach_id and lesson_date = p_date and status <> 'cancelled'
      and p_start < start_minutes + slot_minutes and p_start + 90 > start_minutes
  ) then
    return jsonb_build_object('ok', false, 'error', 'El profe ya tiene una clase en ese horario.');
  end if;

  if p_court_id is not null then
    if exists (
      select 1 from court_bookings where court_id = p_court_id and booking_date = p_date and status <> 'cancelled'
        and p_start < start_minutes + slot_minutes and p_start + 90 > start_minutes
    ) then
      return jsonb_build_object('ok', false, 'error', 'La cancha ya está ocupada.');
    end if;
    select name into v_court_name from courts where id = p_court_id;
  end if;

  insert into lessons (club_id, coach_id, court_id, customer_name, customer_phone, lesson_date, start_minutes, slot_minutes, status, kind)
  values (v_club, p_coach_id, p_court_id, trim(p_name), nullif(trim(p_phone), ''), p_date, p_start, 90, 'scheduled', 'individual')
  returning id into v_lesson;

  if p_court_id is not null then
    insert into court_bookings (club_id, court_id, booking_date, start_minutes, slot_minutes, status, kind, customer_name, customer_phone)
    values (v_club, p_court_id, p_date, p_start, 90, 'reserved', 'class', 'Clase: ' || trim(p_name), nullif(trim(p_phone), ''));
  end if;

  return jsonb_build_object('ok', true, 'lesson_id', v_lesson, 'coach_name', v_coach_name,
    'coach_phone', v_coach_phone, 'court_name', v_court_name, 'start', p_start);
end;
$$;

grant execute on function bot_lesson_options(text, date) to anon, authenticated;
grant execute on function bot_book_lesson(text, uuid, uuid, date, int, text, text) to anon, authenticated;
