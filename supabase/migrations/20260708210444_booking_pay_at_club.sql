alter table club_payment_settings
  add column if not exists booking_pay_at_club boolean not null default false;

-- El hold ahora depende del modo: si el club cobra en el club, la reserva
-- se confirma directo (reserved); si cobra online, queda held 30 min.
create or replace function create_public_hold(
  p_slug text, p_court_id uuid, p_date date, p_start int, p_name text, p_phone text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_club uuid; v_price numeric; v_slot int; v_id uuid; v_player uuid; v_digits text;
        v_pay_at_club boolean; v_status text; v_expires timestamptz;
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

  -- Si cobra online, la cancha necesita precio. Si cobra en el club, no.
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

  -- CRM por telefono (no rompe la reserva si falla)
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

  if v_pay_at_club then
    v_status := 'reserved'; v_expires := null;
  else
    v_status := 'held'; v_expires := now() + interval '30 minutes';
  end if;

  insert into court_bookings(club_id, court_id, booking_date, start_minutes, slot_minutes,
    status, kind, customer_name, customer_phone, player_id, price, hold_expires_at, note)
  values (v_club, p_court_id, p_date, p_start, v_slot, v_status, 'casual',
    trim(p_name), nullif(trim(p_phone),''), v_player, v_price, v_expires,
    case when v_pay_at_club then 'Pago en el club' else null end)
  returning id into v_id;

  return jsonb_build_object('ok',true,'id',v_id,'pay_at_club',v_pay_at_club);
end;
$$;;