-- Clubes que aceptan reserva online (canchas activas con precio + MP conectado)
create or replace function public_booking_clubs()
returns jsonb language sql security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('name',c.name,'slug',c.slug,'city',c.city) order by c.name),'[]'::jsonb)
  from clubs c
  where c.is_active
    and exists (select 1 from courts co where co.club_id=c.id and co.is_active and coalesce(co.price_per_slot,0) > 0)
    and exists (select 1 from club_payment_settings cps where cps.club_id=c.id and cps.mp_access_token is not null);
$$;

-- Canchas + reservas del dia (sin datos personales) para calcular turnos libres
create or replace function public_court_day(p_slug text, p_date date)
returns jsonb language sql security definer set search_path=public as $$
  with cl as (select id, name, city from clubs where slug=p_slug and is_active)
  select jsonb_build_object(
    'club', (select jsonb_build_object('name',name,'city',city) from cl),
    'courts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',co.id,'name',co.name,'number',co.number,
        'open_hour',co.open_hour,'close_hour',co.close_hour,
        'slot_minutes',co.slot_minutes,'price_per_slot',co.price_per_slot,
        'operating_days',co.operating_days) order by co.number)
      from courts co where co.club_id=(select id from cl) and co.is_active
        and coalesce(co.price_per_slot,0) > 0
    ),'[]'::jsonb),
    'bookings', coalesce((
      select jsonb_agg(jsonb_build_object('court_id',b.court_id,'start_minutes',b.start_minutes,'slot_minutes',b.slot_minutes))
      from court_bookings b where b.club_id=(select id from cl) and b.booking_date=p_date and b.status<>'cancelled'
    ),'[]'::jsonb)
  );
$$;

-- Crea un hold de 30 min iniciado por el jugador. Devuelve {ok, id|error}
create or replace function create_public_hold(
  p_slug text, p_court_id uuid, p_date date, p_start int, p_name text, p_phone text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_club uuid; v_price numeric; v_slot int; v_id uuid;
begin
  select id into v_club from clubs where slug=p_slug and is_active;
  if v_club is null then return jsonb_build_object('ok',false,'error','Club no disponible.'); end if;
  select price_per_slot, slot_minutes into v_price, v_slot
    from courts where id=p_court_id and club_id=v_club and is_active;
  if not found then return jsonb_build_object('ok',false,'error','Cancha no válida.'); end if;
  if coalesce(v_price,0) <= 0 then return jsonb_build_object('ok',false,'error','La cancha no tiene precio configurado.'); end if;
  if length(coalesce(trim(p_name),'')) < 2 then return jsonb_build_object('ok',false,'error','Ingresá tu nombre.'); end if;
  if exists (
    select 1 from court_bookings b
    where b.court_id=p_court_id and b.booking_date=p_date and b.status<>'cancelled'
      and p_start < b.start_minutes + b.slot_minutes and p_start + v_slot > b.start_minutes
  ) then
    return jsonb_build_object('ok',false,'error','Ese turno ya no está disponible.');
  end if;
  insert into court_bookings(club_id, court_id, booking_date, start_minutes, slot_minutes,
    status, kind, customer_name, customer_phone, price, hold_expires_at)
  values (v_club, p_court_id, p_date, p_start, v_slot, 'held', 'casual',
    trim(p_name), nullif(trim(p_phone),''), v_price, now() + interval '30 minutes')
  returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id);
end;
$$;

grant execute on function public_booking_clubs() to anon, authenticated;
grant execute on function public_court_day(text,date) to anon, authenticated;
grant execute on function create_public_hold(text,uuid,date,int,text,text) to anon, authenticated;;