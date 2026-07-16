-- Código de invitación para que la pareja reclame su lugar y cree su cuenta.
alter table public.registrations add column if not exists partner_claim_code text;
create unique index if not exists idx_reg_claim_code on public.registrations(partner_claim_code) where partner_claim_code is not null;

-- Leer los datos seguros de una inscripción por código (público, con el código).
create or replace function public.get_registration_claim(p_code text)
returns table(event_name text, event_slug text, club_id uuid, partner_name text, already_claimed boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select e.name, e.slug, r.club_id, r.player_2_name,
         (r.player_2_id is not null
           and exists(select 1 from public.players p where p.id = r.player_2_id and p.profile_id is not null)) as already_claimed
  from public.registrations r
  join public.events e on e.id = r.event_id
  where r.partner_claim_code = p_code;
$$;
revoke all on function public.get_registration_claim(text) from public;
grant execute on function public.get_registration_claim(text) to anon, authenticated;

-- Reclamar el lugar: vincula el jugador (por teléfono) a la cuenta del que reclama.
create or replace function public.claim_partner_spot(p_code text, p_full_name text, p_gender gender, p_category int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; v_uid uuid; v_player uuid; v_phone text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Necesitás una cuenta para reclamar tu lugar.' using errcode='insufficient_privilege'; end if;
  select * into r from public.registrations where partner_claim_code = p_code;
  if not found then raise exception 'Código inválido.' using errcode='no_data_found'; end if;
  v_phone := nullif(trim(coalesce(r.player_2_phone,'')), '');

  -- identidad = teléfono: buscar jugador existente por teléfono
  if v_phone is not null then
    select id into v_player from public.players where phone = v_phone order by created_at limit 1;
  end if;

  if v_player is null then
    insert into public.players (full_name, phone, gender, category, home_club_id, profile_id)
      values (coalesce(nullif(trim(p_full_name),''), r.player_2_name, 'Jugador'),
              v_phone, p_gender, p_category, r.club_id, v_uid)
      returning id into v_player;
  else
    update public.players set
      profile_id = coalesce(profile_id, v_uid),
      full_name  = coalesce(nullif(trim(p_full_name),''), full_name),
      gender     = coalesce(p_gender, gender),
      category   = coalesce(p_category, category)
     where id = v_player;
  end if;

  update public.registrations set player_2_id = v_player where id = r.id;
  update public.profiles set player_id = v_player where id = v_uid and player_id is null;
end;
$$;
revoke all on function public.claim_partner_spot(text, text, gender, int) from public;
grant execute on function public.claim_partner_spot(text, text, gender, int) to authenticated;;