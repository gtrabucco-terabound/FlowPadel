-- Helper SECURITY DEFINER: ¿el evento está abierto y público para inscripción?
-- Bypassa la RLS de events (corre como owner), evitando el problema de subconsulta
-- RLS-sobre-RLS dentro del WITH CHECK del INSERT.
create or replace function public.event_open_for_registration(p_event_id uuid, p_club_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and e.club_id = p_club_id
      and e.status = 'open'
      and e.public_visible = true
  );
$$;
revoke all on function public.event_open_for_registration(uuid, uuid) from public;
grant execute on function public.event_open_for_registration(uuid, uuid) to anon, authenticated;

-- Reemplazar la política de inserción pública para usar el helper.
drop policy if exists registrations_insert_public on public.registrations;
create policy registrations_insert_public on public.registrations
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and public.event_open_for_registration(event_id, club_id)
  );;