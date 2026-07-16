create or replace function public_booking_payinfo(p_id uuid)
returns jsonb language sql security definer set search_path=public as $$
  select jsonb_build_object(
    'checkout_url', b.checkout_url,
    'status', b.status,
    'paid', (b.paid_at is not null),
    'amount', coalesce(b.amount_charged, b.price),
    'date', b.booking_date,
    'start', b.start_minutes,
    'slot', b.slot_minutes,
    'club', cl.name,
    'court', co.name,
    'court_number', co.number
  )
  from court_bookings b
  join clubs cl on cl.id = b.club_id
  left join courts co on co.id = b.court_id
  where b.id = p_id;
$$;

grant execute on function public_booking_payinfo(uuid) to anon, authenticated;;