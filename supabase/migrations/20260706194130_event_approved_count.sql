create or replace function public.event_approved_count(p_event_id uuid)
returns integer
language sql security definer set search_path = public stable as $$
  select count(*)::int from registrations
  where event_id = p_event_id and status = 'approved';
$$;
grant execute on function public.event_approved_count(uuid) to anon, authenticated;;