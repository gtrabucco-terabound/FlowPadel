-- Fix motor de ocupación (canal segmentado): la CTE de "última reserva" filtraba
-- por estados 'confirmed'/'paid' que NO existen en court_bookings (los reales son
-- reserved/held/blocked/cancelled). Con eso el last_date quedaba siempre vacío y
-- TODOS los jugadores caían como "dormidos". Se corrige a los estados reales que
-- representan una reserva efectiva (reserved/held), excluyendo blocked/cancelled.

create or replace function eligible_offer_players(
  p_club_id uuid,
  p_min_matches integer,
  p_inactive_days integer,
  p_max_n integer
) returns table (player_id uuid, full_name text, phone text, reason text)
language sql
security definer
set search_path = public
as $$
  with last_book as (
    select player_id, max(booking_date) as last_date
    from court_bookings
    where club_id = p_club_id and player_id is not null
      and status in ('reserved','held')
    group by player_id
  )
  select p.id, p.full_name, p.phone,
         case when coalesce(p.matches_played,0) >= p_min_matches then 'fiel' else 'dormido' end as reason
  from players p
  left join last_book lb on lb.player_id = p.id
  where p.home_club_id = p_club_id
    and p.receive_offers is true
    and p.notify_whatsapp is true
    and p.phone is not null and length(trim(p.phone)) >= 8
    and (
      coalesce(p.matches_played,0) >= p_min_matches
      or lb.last_date is null
      or lb.last_date < (now() at time zone 'America/Argentina/Buenos_Aires')::date - p_inactive_days
    )
    and not exists (
      select 1 from player_offer_invites poi
      where poi.player_id = p.id
        and poi.invite_date = (now() at time zone 'America/Argentina/Buenos_Aires')::date
    )
  order by coalesce(p.matches_played,0) desc
  limit greatest(p_max_n, 0);
$$;

revoke execute on function eligible_offer_players(uuid,integer,integer,integer) from public, anon;
grant execute on function eligible_offer_players(uuid,integer,integer,integer) to service_role, authenticated;
