-- La reserva pública vuelve al turno NATURAL de alquiler de la cancha.
-- Las franjas de entrenamiento no afectan el alquiler: el club sigue operando
-- normal y la cancha se puede alquilar para jugar hasta que se agende una clase.

create or replace function public.create_public_hold(p_slug text, p_court_id uuid, p_date date, p_start integer, p_name text, p_phone text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_club uuid; v_price numeric; v_slot int; v_id uuid; v_player uuid; v_digits text;
        v_pay_at_club boolean; v_status text; v_expires timestamptz; v_off int;
begin
  select id into v_club from clubs where slug=p_slug and is_active;
  if v_club is null then return jsonb_build_object('ok',false,'error','Club no disponible.'); end if;
  select price_per_slot, slot_minutes into v_price, v_slot
    from courts where id=p_court_id and club_id=v_club and is_active;
  if not found then return jsonb_build_object('ok',false,'error','Cancha no válida.'); end if;
  if length(coalesce(trim(p_name),'')) < 2 then return jsonb_build_object('ok',false,'error','Ingresá tu nombre.'); end if;

  select coalesce(booking_pay_at_club,false) into v_pay_at_club
    from club_payment_settings where club_id=v_club;
  v_pay_at_club := coalesce(v_pay_at_club,false);
  if not v_pay_at_club and coalesce(v_price,0) <= 0 then
    return jsonb_build_object('ok',false,'error','La cancha no tiene precio configurado.');
  end if;

  if exists (
    select 1 from court_bookings b
    where b.court_id=p_court_id and b.booking_date=p_date and b.status<>'cancelled'
      and p_start < b.start_minutes + b.slot_minutes and p_start + v_slot > b.start_minutes
  ) then
    return jsonb_build_object('ok',false,'error','Ese turno ya no está disponible.');
  end if;

  select discount_pct into v_off from court_offers
    where court_id=p_court_id and booking_date=p_date and start_minutes=p_start and expires_at > now();
  if v_off is not null and v_off > 0 and coalesce(v_price,0) > 0 then
    v_price := round(v_price * (100 - v_off) / 100.0);
    delete from court_offers where court_id=p_court_id and booking_date=p_date and start_minutes=p_start;
  end if;

  v_digits := right(regexp_replace(coalesce(p_phone,''),'\D','','g'),10);
  if length(v_digits) >= 8 then
    begin
      select id into v_player from players
       where right(regexp_replace(coalesce(phone,''),'\D','','g'),10) = v_digits limit 1;
      if v_player is null then
        insert into players (full_name, phone, home_club_id)
        values (trim(p_name), trim(p_phone), v_club) returning id into v_player;
      end if;
    exception when others then v_player := null;
    end;
  end if;

  if v_pay_at_club then v_status := 'reserved'; v_expires := null;
  else v_status := 'held'; v_expires := now() + interval '30 minutes'; end if;

  insert into court_bookings(club_id, court_id, booking_date, start_minutes, slot_minutes,
    status, kind, customer_name, customer_phone, player_id, price, hold_expires_at, note)
  values (v_club, p_court_id, p_date, p_start, v_slot, v_status, 'casual',
    trim(p_name), nullif(trim(p_phone),''), v_player, v_price, v_expires,
    case when v_pay_at_club then 'Pago en el club' else null end)
  returning id into v_id;

  return jsonb_build_object('ok',true,'id',v_id,'pay_at_club',v_pay_at_club);
end;
$function$;

create or replace function public.public_court_day(p_slug text, p_date date)
 returns jsonb
 language sql
 security definer
 set search_path to 'public'
as $function$
  with cl as (select id, name, city from clubs where slug=p_slug and is_active)
  select jsonb_build_object(
    'club', (select jsonb_build_object(
        'name', name, 'city', city,
        'pay_at_club', coalesce((select booking_pay_at_club from club_payment_settings where club_id=cl.id), false)
      ) from cl),
    'courts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',co.id,'name',co.name,'number',co.number,
        'open_hour',co.open_hour,'close_hour',co.close_hour,
        'slot_minutes',co.slot_minutes,'price_per_slot',co.price_per_slot,
        'operating_days',co.operating_days) order by co.number)
      from courts co where co.club_id=(select id from cl) and co.is_active and coalesce(co.price_per_slot,0) > 0
    ),'[]'::jsonb),
    'bookings', coalesce((
      select jsonb_agg(jsonb_build_object('court_id',b.court_id,'start_minutes',b.start_minutes,'slot_minutes',b.slot_minutes,'status',b.status))
      from court_bookings b where b.club_id=(select id from cl) and b.booking_date=p_date and b.status<>'cancelled'
    ),'[]'::jsonb),
    'offers', coalesce((
      select jsonb_agg(jsonb_build_object('court_id',o.court_id,'start_minutes',o.start_minutes,'discount_pct',o.discount_pct))
      from court_offers o where o.club_id=(select id from cl) and o.booking_date=p_date and o.expires_at > now()
    ),'[]'::jsonb)
  );
$function$;
