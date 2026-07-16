create or replace function public.notify_registration_status(
  p_registration_id uuid,
  p_kind text
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_reg record; v_ev record; v_title text; v_body text; v_url text;
        v_ids uuid[]; v_count int;
begin
  select * into v_reg from registrations where id = p_registration_id;
  if not found then return 0; end if;
  select id, name, slug, club_id into v_ev from events where id = v_reg.event_id;
  if not (public.is_superadmin() or public.is_club_member(v_ev.club_id)) then
    raise exception 'no autorizado';
  end if;

  v_url := '/event/' || v_ev.slug;
  if p_kind = 'confirmed' then
    v_title := 'Inscripción confirmada';
    v_body := 'Tu lugar en "' || v_ev.name || '" está asegurado. ¡Nos vemos en la cancha!';
  elsif p_kind = 'waitlist' then
    v_title := 'Estás en lista de espera';
    v_body := 'Quedaste en lista de espera en "' || v_ev.name || '". Te avisamos si se libera un lugar.';
  elsif p_kind = 'rejected' then
    v_title := 'Inscripción no confirmada';
    v_body := 'Tu inscripción en "' || v_ev.name || '" no pudo confirmarse esta vez.';
  elsif p_kind = 'received' then
    v_title := 'Inscripción recibida';
    v_body := 'Recibimos tu inscripción a "' || v_ev.name || '". Queda pendiente de confirmación.';
  else
    return 0;
  end if;

  v_ids := array_remove(array[v_reg.player_1_id, v_reg.player_2_id], null);
  if array_length(v_ids, 1) is null then return 0; end if;

  insert into notifications (player_id, type, title, body, url, event_id)
    select unnest(v_ids), 'registration', v_title, v_body, v_url, v_ev.id;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function public.notify_registration_status(uuid, text) to authenticated;;