create or replace function public_court_day(p_slug text, p_date date)
returns jsonb language sql security definer set search_path=public as $$
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
      from courts co where co.club_id=(select id from cl) and co.is_active
        and coalesce(co.price_per_slot,0) > 0
    ),'[]'::jsonb),
    'bookings', coalesce((
      select jsonb_agg(jsonb_build_object('court_id',b.court_id,'start_minutes',b.start_minutes,'slot_minutes',b.slot_minutes,'status',b.status))
      from court_bookings b where b.club_id=(select id from cl) and b.booking_date=p_date and b.status<>'cancelled'
    ),'[]'::jsonb)
  );
$$;;