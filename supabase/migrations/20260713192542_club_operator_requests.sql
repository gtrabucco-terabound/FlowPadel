create table if not exists club_operator_requests (
  id uuid primary key default gen_random_uuid(),
  operator_profile_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid,
  unique (operator_profile_id, club_id)
);
alter table club_operator_requests enable row level security;
drop policy if exists cor_select on club_operator_requests;
create policy cor_select on club_operator_requests
  for select using (operator_profile_id = auth.uid() or is_club_admin(club_id) or is_superadmin());

-- El comercial (logueado) pide operar un club.
create or replace function operator_request_club(p_club_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok',false,'error','No autenticado'); end if;
  if exists (select 1 from club_members where club_id=p_club_id and profile_id=v_uid) then
    return jsonb_build_object('ok',false,'error','Ya sos miembro/operador de ese club');
  end if;
  insert into club_operator_requests (operator_profile_id, club_id, status, created_at, decided_at, decided_by)
  values (v_uid, p_club_id, 'pending', now(), null, null)
  on conflict (operator_profile_id, club_id)
    do update set status='pending', created_at=now(), decided_at=null, decided_by=null;
  return jsonb_build_object('ok',true);
end; $$;

-- El admin del club aprueba/rechaza. Al aceptar, agrega al operador como miembro 'operator'.
create or replace function operator_decide(p_request_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_req club_operator_requests;
begin
  select * into v_req from club_operator_requests where id=p_request_id;
  if not found then return jsonb_build_object('ok',false,'error','Solicitud no encontrada'); end if;
  if not is_club_admin(v_req.club_id) and not is_superadmin() then
    return jsonb_build_object('ok',false,'error','Sin permiso');
  end if;
  if p_accept then
    if not exists (select 1 from club_members where profile_id=v_req.operator_profile_id and club_id=v_req.club_id) then
      insert into club_members (profile_id, club_id, role)
      values (v_req.operator_profile_id, v_req.club_id, 'operator');
    end if;
    update club_operator_requests set status='accepted', decided_at=now(), decided_by=auth.uid() where id=p_request_id;
  else
    update club_operator_requests set status='rejected', decided_at=now(), decided_by=auth.uid() where id=p_request_id;
  end if;
  return jsonb_build_object('ok',true);
end; $$;

-- Solicitudes pendientes de un club (para que el admin las vea, con nombre/email).
create or replace function club_operator_pending(p_club_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not is_club_admin(p_club_id) and not is_superadmin() then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'name', coalesce(pl.full_name, u.email),
      'email', u.email,
      'created_at', r.created_at
    ) order by r.created_at)
    from club_operator_requests r
    left join auth.users u on u.id = r.operator_profile_id
    left join players pl on pl.profile_id = r.operator_profile_id
    where r.club_id = p_club_id and r.status = 'pending'
  ), '[]'::jsonb);
end; $$;

grant execute on function operator_request_club(uuid) to authenticated;
grant execute on function operator_decide(uuid, boolean) to authenticated;
grant execute on function club_operator_pending(uuid) to authenticated;;