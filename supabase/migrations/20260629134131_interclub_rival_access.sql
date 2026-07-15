-- El club rival puede VER el evento interclub (además del organizador / público).
create policy events_select_rival on public.events
  for select to authenticated
  using (is_interclub and rival_club_id is not null and (public.is_club_member(rival_club_id) or public.is_superadmin()));

-- Aceptar el desafío interclub: solo un admin del club rival (o superadmin).
create or replace function public.accept_interclub(p_event_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_rival uuid; v_inter boolean;
begin
  select rival_club_id, is_interclub into v_rival, v_inter from public.events where id = p_event_id;
  if not coalesce(v_inter,false) or v_rival is null then
    raise exception 'El evento no es interclub.' using errcode='no_data_found';
  end if;
  if not (public.is_club_admin(v_rival) or public.is_superadmin()) then
    raise exception 'Solo un admin del club rival puede aceptar.' using errcode='insufficient_privilege';
  end if;
  update public.events set rival_accepted = true where id = p_event_id;
end;
$$;
revoke all on function public.accept_interclub(uuid) from public;
grant execute on function public.accept_interclub(uuid) to authenticated;;