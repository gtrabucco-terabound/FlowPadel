-- Listar miembros de un club con su email/nombre (SECURITY DEFINER: el club_admin
-- no puede leer profiles ajenos por RLS, pero puede ver su roster).
create or replace function public.list_club_members(p_club_id uuid)
returns table(profile_id uuid, email text, full_name text, role club_member_role)
language sql stable security definer set search_path = public, pg_temp as $$
  select cm.profile_id, p.email::text, p.full_name, cm.role
  from public.club_members cm
  join public.profiles p on p.id = cm.profile_id
  where cm.club_id = p_club_id
    and (public.is_club_member(p_club_id) or public.is_superadmin())
  order by cm.role, p.full_name;
$$;
revoke all on function public.list_club_members(uuid) from public;
grant execute on function public.list_club_members(uuid) to authenticated;

-- Agregar/actualizar un miembro por email (solo club_admin del club o superadmin).
-- Devuelve 'ok' | 'not_found' (no existe cuenta con ese email).
create or replace function public.add_club_member(p_club_id uuid, p_email text, p_role club_member_role)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare v_pid uuid;
begin
  if not (public.is_club_admin(p_club_id) or public.is_superadmin()) then
    raise exception 'No autorizado.' using errcode='insufficient_privilege';
  end if;
  select id into v_pid from public.profiles where email = p_email;
  if v_pid is null then return 'not_found'; end if;
  insert into public.club_members (club_id, profile_id, role)
    values (p_club_id, v_pid, p_role)
    on conflict (club_id, profile_id) do update set role = excluded.role;
  return 'ok';
end;
$$;
revoke all on function public.add_club_member(uuid, text, club_member_role) from public;
grant execute on function public.add_club_member(uuid, text, club_member_role) to authenticated;;