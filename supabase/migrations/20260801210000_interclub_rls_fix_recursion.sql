-- Rompe la recursión de RLS de interclub: la verificación de "participante" va
-- en funciones SECURITY DEFINER (consultan sin volver a disparar RLS).
create or replace function public.is_interclub_participant(p_liga uuid)
returns boolean language sql security definer stable set search_path=public as $$
  select exists (
    select 1 from interclub_teams t
    where t.liga_id = p_liga and t.club_id is not null and is_club_member(t.club_id)
  );
$$;

create or replace function public.interclub_pair_participant(p_team uuid)
returns boolean language sql security definer stable set search_path=public as $$
  select public.is_interclub_participant((select liga_id from interclub_teams where id = p_team));
$$;

create or replace function public.interclub_line_participant(p_series uuid)
returns boolean language sql security definer stable set search_path=public as $$
  select public.is_interclub_participant((select liga_id from interclub_series where id = p_series));
$$;

grant execute on function public.is_interclub_participant(uuid) to authenticated;
grant execute on function public.interclub_pair_participant(uuid) to authenticated;
grant execute on function public.interclub_line_participant(uuid) to authenticated;

drop policy if exists interclub_ligas_participant_read on interclub_ligas;
create policy interclub_ligas_participant_read on interclub_ligas for select to authenticated
  using (public.is_interclub_participant(id));

drop policy if exists interclub_teams_participant_read on interclub_teams;
create policy interclub_teams_participant_read on interclub_teams for select to authenticated
  using (public.is_interclub_participant(liga_id));

drop policy if exists interclub_series_participant_read on interclub_series;
create policy interclub_series_participant_read on interclub_series for select to authenticated
  using (public.is_interclub_participant(liga_id));

drop policy if exists interclub_pairs_participant_read on interclub_pairs;
create policy interclub_pairs_participant_read on interclub_pairs for select to authenticated
  using (public.interclub_pair_participant(team_id));

drop policy if exists interclub_series_lines_participant_read on interclub_series_lines;
create policy interclub_series_lines_participant_read on interclub_series_lines for select to authenticated
  using (public.interclub_line_participant(series_id));
