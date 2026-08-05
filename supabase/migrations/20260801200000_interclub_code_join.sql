-- Capa A: código de liga, equipo por club (club_id), confirmación, y RPCs seguras
-- para que cada club administre SU equipo dentro de una liga compartida.
alter table interclub_ligas add column if not exists join_code text;
alter table interclub_teams add column if not exists club_id uuid references clubs(id) on delete set null;
alter table interclub_teams add column if not exists confirmed boolean not null default false;

update interclub_ligas set join_code = upper(substr(md5(random()::text || id::text), 1, 6))
  where join_code is null;
create unique index if not exists interclub_ligas_join_code_key on interclub_ligas(join_code);

drop policy if exists interclub_ligas_participant_read on interclub_ligas;
create policy interclub_ligas_participant_read on interclub_ligas for select to authenticated
  using (exists (select 1 from interclub_teams t
    where t.liga_id = interclub_ligas.id and t.club_id is not null and is_club_member(t.club_id)));

drop policy if exists interclub_teams_participant_read on interclub_teams;
create policy interclub_teams_participant_read on interclub_teams for select to authenticated
  using (exists (select 1 from interclub_teams t2
    where t2.liga_id = interclub_teams.liga_id and t2.club_id is not null and is_club_member(t2.club_id)));

drop policy if exists interclub_pairs_participant_read on interclub_pairs;
create policy interclub_pairs_participant_read on interclub_pairs for select to authenticated
  using (exists (select 1 from interclub_teams t
    join interclub_teams t2 on t2.liga_id = t.liga_id
    where t.id = interclub_pairs.team_id and t2.club_id is not null and is_club_member(t2.club_id)));

drop policy if exists interclub_series_participant_read on interclub_series;
create policy interclub_series_participant_read on interclub_series for select to authenticated
  using (exists (select 1 from interclub_teams t2
    where t2.liga_id = interclub_series.liga_id and t2.club_id is not null and is_club_member(t2.club_id)));

drop policy if exists interclub_series_lines_participant_read on interclub_series_lines;
create policy interclub_series_lines_participant_read on interclub_series_lines for select to authenticated
  using (exists (select 1 from interclub_series s
    join interclub_teams t2 on t2.liga_id = s.liga_id
    where s.id = interclub_series_lines.series_id and t2.club_id is not null and is_club_member(t2.club_id)));

create or replace function public.join_interclub(p_code text, p_club_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_liga uuid; v_name text; v_status text;
begin
  if not is_club_member(p_club_id) then return jsonb_build_object('ok',false,'error','Sin acceso al club.'); end if;
  select id, status into v_liga, v_status from interclub_ligas where upper(join_code) = upper(trim(p_code));
  if v_liga is null then return jsonb_build_object('ok',false,'error','Código inválido.'); end if;
  if v_status <> 'draft' then return jsonb_build_object('ok',false,'error','La liga ya está en juego.'); end if;
  if exists (select 1 from interclub_teams where liga_id=v_liga and club_id=p_club_id)
    then return jsonb_build_object('ok',true,'liga',v_liga); end if;
  select name into v_name from clubs where id=p_club_id;
  insert into interclub_teams(liga_id, name, club_id) values (v_liga, coalesce(v_name,'Club'), p_club_id);
  return jsonb_build_object('ok',true,'liga',v_liga);
end$$;

create or replace function public.save_interclub_pair(p_liga uuid, p_club_id uuid, p_category text, p_pair text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_team uuid;
begin
  if not is_club_member(p_club_id) then return jsonb_build_object('ok',false,'error','Sin acceso.'); end if;
  select id into v_team from interclub_teams where liga_id=p_liga and club_id=p_club_id;
  if v_team is null then return jsonb_build_object('ok',false,'error','Tu club no participa en esta liga.'); end if;
  insert into interclub_pairs(team_id, category, pair_name) values (v_team, p_category, p_pair)
    on conflict (team_id,category) do update set pair_name=excluded.pair_name;
  return jsonb_build_object('ok',true);
end$$;

create or replace function public.confirm_interclub_team(p_liga uuid, p_club_id uuid, p_confirmed boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_team uuid;
begin
  if not is_club_member(p_club_id) then return jsonb_build_object('ok',false,'error','Sin acceso.'); end if;
  update interclub_teams set confirmed=p_confirmed where liga_id=p_liga and club_id=p_club_id returning id into v_team;
  if v_team is null then return jsonb_build_object('ok',false,'error','Tu club no participa en esta liga.'); end if;
  return jsonb_build_object('ok',true);
end$$;

revoke all on function public.join_interclub(text,uuid) from public;
revoke all on function public.save_interclub_pair(uuid,uuid,text,text) from public;
revoke all on function public.confirm_interclub_team(uuid,uuid,boolean) from public;
grant execute on function public.join_interclub(text,uuid) to authenticated;
grant execute on function public.save_interclub_pair(uuid,uuid,text,text) to authenticated;
grant execute on function public.confirm_interclub_team(uuid,uuid,boolean) to authenticated;

-- Código autogenerado por la base (único) vía trigger.
create or replace function public.gen_interclub_code()
returns text language plpgsql set search_path=public as $$
declare v_code text; v_abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_abc, 1 + floor(random() * length(v_abc))::int, 1);
    end loop;
    exit when not exists (select 1 from interclub_ligas where join_code = v_code);
  end loop;
  return v_code;
end$$;

create or replace function public.set_interclub_code()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.join_code is null then new.join_code := gen_interclub_code(); end if;
  return new;
end$$;

drop trigger if exists trg_interclub_code on interclub_ligas;
create trigger trg_interclub_code before insert on interclub_ligas
  for each row execute function set_interclub_code();
