create or replace function public.admin_create_club(
  p_name text,
  p_city text default null,
  p_admin_email text default null,
  p_lead_id uuid default null
) returns json
language plpgsql security definer set search_path = public as $$
declare v_slug text; v_club_id uuid; v_admin_id uuid; v_admin_status text;
begin
  if not public.is_superadmin() then
    raise exception 'no autorizado';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'El nombre del club es obligatorio';
  end if;

  -- slug único a partir del nombre + sufijo corto
  v_slug := lower(regexp_replace(btrim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'club'; end if;
  v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into clubs (name, slug, city)
    values (btrim(p_name), v_slug, nullif(btrim(p_city), ''))
    returning id into v_club_id;

  -- Asignar admin por email (si tiene cuenta)
  v_admin_status := 'sin_admin';
  if coalesce(btrim(p_admin_email), '') <> '' then
    select id into v_admin_id from profiles
      where lower(email) = lower(btrim(p_admin_email)) limit 1;
    if v_admin_id is not null then
      insert into club_members (club_id, profile_id, role)
        values (v_club_id, v_admin_id, 'club_admin');
      v_admin_status := 'admin_asignado';
    else
      v_admin_status := 'email_sin_cuenta';
    end if;
  end if;

  -- Si viene de un lead del CRM, marcarlo como convertido
  if p_lead_id is not null then
    update club_leads set converted_club_id = v_club_id, updated_at = now()
      where id = p_lead_id;
  end if;

  return json_build_object('club_id', v_club_id, 'slug', v_slug, 'admin_status', v_admin_status);
end $$;

grant execute on function public.admin_create_club(text, text, text, uuid) to authenticated;;