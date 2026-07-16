create or replace function public.registration_phone_taken(p_event_id uuid, p_phone text)
returns boolean
language sql security definer set search_path = public stable as $$
  select exists(
    select 1 from registrations
    where event_id = p_event_id
      and status <> 'rejected'
      and (player_1_phone = btrim(p_phone) or player_2_phone = btrim(p_phone))
  );
$$;
grant execute on function public.registration_phone_taken(uuid, text) to anon, authenticated;

-- Limpieza de las 2 inscripciones duplicadas de prueba (dejo la aprobada).
delete from registrations where id in (
  '8ff07ab8-8c9c-4aea-99f2-0c2b7e89d26d',
  '18ab84c7-96ea-47fc-b4a4-77a6b098f6ca'
);;