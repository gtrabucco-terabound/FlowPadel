create or replace function bot_player_status(p_phone text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_player uuid; v_name text; v_digits text; v_regs jsonb; v_books jsonb;
begin
  v_digits := right(regexp_replace(coalesce(p_phone,''),'\D','','g'),10);
  if length(v_digits) < 8 then return jsonb_build_object('found', false); end if;

  select id, full_name into v_player, v_name from players
   where right(regexp_replace(coalesce(phone,''),'\D','','g'),10) = v_digits
   limit 1;
  if v_player is null then return jsonb_build_object('found', false); end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'event', e.name, 'status', r.status, 'sena', (r.deposit_paid_at is not null)
    ) order by e.start_date desc nulls last), '[]'::jsonb)
  into v_regs
  from registrations r
  join events e on e.id = r.event_id
  where (r.player_1_id = v_player or r.player_2_id = v_player
      or right(regexp_replace(coalesce(r.player_1_phone,''),'\D','','g'),10) = v_digits
      or right(regexp_replace(coalesce(r.player_2_phone,''),'\D','','g'),10) = v_digits)
    and r.status <> 'rejected';

  select coalesce(jsonb_agg(jsonb_build_object(
      'date', b.booking_date, 'start', b.start_minutes, 'club', cl.name,
      'paid', (b.paid_at is not null), 'status', b.status
    ) order by b.booking_date, b.start_minutes), '[]'::jsonb)
  into v_books
  from court_bookings b
  join clubs cl on cl.id = b.club_id
  where (b.player_id = v_player
      or right(regexp_replace(coalesce(b.customer_phone,''),'\D','','g'),10) = v_digits)
    and b.status <> 'cancelled'
    and b.booking_date >= (now() - interval '3 hours')::date;

  return jsonb_build_object('found', true, 'name', v_name, 'tournaments', v_regs, 'bookings', v_books);
end;
$$;

grant execute on function bot_player_status(text) to anon, authenticated;;