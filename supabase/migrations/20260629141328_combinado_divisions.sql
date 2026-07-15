-- Equipos etiquetados por división (modalidad + categoría) para torneos combinados.
alter table public.teams
  add column if not exists modality       tournament_modality,
  add column if not exists category_value text;

-- Genera zonas POR DIVISIÓN (modalidad+categoría). Para combinados, cada
-- modalidad/categoría corre por separado (no se cruzan). Para torneos de una
-- sola modalidad, hay una única división. Los partidos de grupo y standings ya
-- son por zona, así que quedan separados por división automáticamente.
create or replace function public.generate_division_zones(p_event_id uuid, p_teams_per_zone int default 4)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_club uuid; v_evmod tournament_modality; v_evcat text;
  d record; t record;
  v_zone uuid; v_idx int; v_zone_n int; v_created int := 0; v_letter text; v_label text;
begin
  v_club := public._assert_event_access(p_event_id);
  select modality, category_value into v_evmod, v_evcat from public.events where id = p_event_id;

  delete from public.matches where event_id = p_event_id and phase = 'group_stage';
  delete from public.rounds  where event_id = p_event_id;
  delete from public.zones   where event_id = p_event_id;

  for d in
    select distinct
      coalesce(tm.modality, v_evmod) as modality,
      coalesce(tm.category_value, v_evcat) as category_value
    from public.teams tm
    where tm.event_id = p_event_id and tm.ephemeral = false
  loop
    v_idx := 0; v_zone_n := 0; v_zone := null;
    v_label := trim(coalesce(initcap(d.modality::text), '') || ' ' || coalesce(d.category_value, ''));
    for t in
      select tm.id from public.teams tm
      where tm.event_id = p_event_id and tm.ephemeral = false
        and coalesce(tm.modality, v_evmod) is not distinct from d.modality
        and coalesce(tm.category_value, v_evcat) is not distinct from d.category_value
      order by tm.created_at, tm.id
    loop
      if v_idx % greatest(p_teams_per_zone,2) = 0 then
        v_zone_n := v_zone_n + 1;
        v_letter := chr(64 + v_zone_n);
        insert into public.zones (event_id, club_id, name, modality, category_value)
          values (p_event_id, v_club,
                  nullif(v_label,'') || case when v_label <> '' then ' - ' else '' end || 'Zona ' || v_letter,
                  d.modality, d.category_value)
          returning id into v_zone;
        v_created := v_created + 1;
      end if;
      insert into public.zone_teams (zone_id, team_id) values (v_zone, t.id) on conflict do nothing;
      v_idx := v_idx + 1;
    end loop;
  end loop;
  return v_created;
end;
$$;
revoke all on function public.generate_division_zones(uuid, int) from public;
grant execute on function public.generate_division_zones(uuid, int) to authenticated;;