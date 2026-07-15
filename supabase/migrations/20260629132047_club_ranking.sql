-- Ranking de clubes: suma de puntos que sus jugadores acumularon en todos los
-- torneos (player_standings), atribuidos al club que cada jugador REPRESENTA
-- (players.home_club_id).
create or replace function public.club_ranking()
returns table(club_id uuid, club_name text, total_points bigint, players_count integer, tournaments_count integer)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id, c.name,
         coalesce(sum(ps.points),0)::bigint as total_points,
         count(distinct pl.id)::int as players_count,
         count(distinct ps.event_id)::int as tournaments_count
  from public.clubs c
  left join public.players pl on pl.home_club_id = c.id
  left join public.player_standings ps on ps.player_id = pl.id
  where c.is_active
  group by c.id, c.name
  order by total_points desc, c.name;
$$;
revoke all on function public.club_ranking() from public;
grant execute on function public.club_ranking() to anon, authenticated;;