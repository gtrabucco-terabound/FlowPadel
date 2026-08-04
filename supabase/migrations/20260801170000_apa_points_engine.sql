-- Motor de puntos APA (ranking individual). Por la ronda más profunda que
-- alcanzó cada pareja en el cuadro: Campeón 1000, Finalista 800, Semi 600,
-- Cuartos 400, Octavos 200. Solo cuentan las parejas con jugadores registrados.
create table if not exists apa_points (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  player_id  uuid not null references players(id) on delete cascade,
  team_id    uuid references teams(id) on delete set null,
  phase      text not null,
  points     integer not null default 0,
  awarded_at timestamptz not null default now(),
  unique (event_id, player_id)
);
create index if not exists apa_points_player_idx on apa_points(player_id);
create index if not exists apa_points_awarded_idx on apa_points(awarded_at);

alter table apa_points enable row level security;
drop policy if exists apa_points_read on apa_points;
create policy apa_points_read on apa_points for select to anon, authenticated using (true);

create or replace function public.recompute_apa_points(p_event_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_champion uuid;
begin
  delete from apa_points where event_id = p_event_id;

  select winner_team_id into v_champion
  from matches
  where event_id = p_event_id and phase='final' and status='completed'
  order by created_at desc limit 1;

  insert into apa_points (event_id, player_id, team_id, phase, points)
  select p_event_id, pl.player_id, d.team_id,
    case when d.team_id = v_champion then 'champion' else d.phase::text end,
    case
      when d.team_id = v_champion then 1000
      when d.phase = 'final' then 800
      when d.phase = 'semi_final' then 600
      when d.phase = 'quarter_final' then 400
      when d.phase = 'round_of_16' then 200
      else 0
    end
  from (
    select tm.team_id, (array_agg(tm.phase order by tm.rank desc))[1] as phase
    from (
      select t.id as team_id, m.phase,
        case m.phase when 'round_of_16' then 1 when 'quarter_final' then 2
          when 'semi_final' then 3 when 'final' then 4 else 0 end as rank
      from matches m
      join teams t on t.id in (m.team_a_id, m.team_b_id)
      where m.event_id = p_event_id
        and m.phase in ('round_of_16','quarter_final','semi_final','final')
        and m.status = 'completed'
    ) tm
    group by tm.team_id
  ) d
  cross join lateral (
    select unnest(array[t.player_1_id, t.player_2_id]) as player_id
    from teams t where t.id = d.team_id
  ) pl
  where pl.player_id is not null;
end;
$$;
revoke all on function public.recompute_apa_points(uuid) from public;
grant execute on function public.recompute_apa_points(uuid) to authenticated;
