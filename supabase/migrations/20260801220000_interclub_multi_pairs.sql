-- Varias parejas por categoría: cantidad por categoría (pairs_per_cat) + "slot".
alter table interclub_ligas add column if not exists pairs_per_cat jsonb not null default '{}';
alter table interclub_pairs add column if not exists slot integer not null default 1;
alter table interclub_series_lines add column if not exists slot integer not null default 1;

alter table interclub_pairs drop constraint if exists interclub_pairs_team_id_category_key;
create unique index if not exists interclub_pairs_team_cat_slot on interclub_pairs(team_id, category, slot);

alter table interclub_series_lines drop constraint if exists interclub_series_lines_series_id_category_key;
create unique index if not exists interclub_series_lines_series_cat_slot on interclub_series_lines(series_id, category, slot);

create or replace function public.save_interclub_pair(p_liga uuid, p_club_id uuid, p_category text, p_slot int, p_pair text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_team uuid;
begin
  if not is_club_member(p_club_id) then return jsonb_build_object('ok',false,'error','Sin acceso.'); end if;
  select id into v_team from interclub_teams where liga_id=p_liga and club_id=p_club_id;
  if v_team is null then return jsonb_build_object('ok',false,'error','Tu club no participa en esta liga.'); end if;
  insert into interclub_pairs(team_id, category, slot, pair_name) values (v_team, p_category, p_slot, p_pair)
    on conflict (team_id,category,slot) do update set pair_name=excluded.pair_name;
  return jsonb_build_object('ok',true);
end$$;
grant execute on function public.save_interclub_pair(uuid,uuid,text,int,text) to authenticated;
drop function if exists public.save_interclub_pair(uuid,uuid,text,text);
