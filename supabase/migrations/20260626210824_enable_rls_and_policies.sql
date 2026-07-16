create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin');
$$;

create or replace function public.is_club_member(club uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.club_members where club_id = club and profile_id = auth.uid());
$$;

create or replace function public.is_club_admin(club uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.club_members where club_id = club and profile_id = auth.uid() and role = 'club_admin');
$$;

revoke all on function public.is_superadmin()          from public;
revoke all on function public.is_club_member(uuid)     from public;
revoke all on function public.is_club_admin(uuid)      from public;
grant execute on function public.is_superadmin()       to authenticated;
grant execute on function public.is_club_member(uuid)  to authenticated;
grant execute on function public.is_club_admin(uuid)   to authenticated;

alter table public.clubs          enable row level security;
alter table public.profiles       enable row level security;
alter table public.club_members   enable row level security;
alter table public.players        enable row level security;
alter table public.elo_history    enable row level security;
alter table public.categories     enable row level security;
alter table public.courts         enable row level security;
alter table public.events         enable row level security;
alter table public.registrations  enable row level security;
alter table public.teams          enable row level security;
alter table public.zones          enable row level security;
alter table public.zone_teams     enable row level security;
alter table public.brackets       enable row level security;
alter table public.matches        enable row level security;
alter table public.standings      enable row level security;
alter table public.payments       enable row level security;

create policy clubs_select_public on public.clubs for select to anon, authenticated using (true);
create policy clubs_write_superadmin on public.clubs for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid() or public.is_superadmin());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid() or public.is_superadmin()) with check (id = auth.uid() or public.is_superadmin());

create policy club_members_select on public.club_members for select to authenticated using (public.is_club_member(club_id) or public.is_superadmin());
create policy club_members_write on public.club_members for all to authenticated using (public.is_club_admin(club_id) or public.is_superadmin()) with check (public.is_club_admin(club_id) or public.is_superadmin());

create policy categories_select_public on public.categories for select to anon, authenticated using (true);
create policy categories_write_admin on public.categories for all to authenticated using (public.is_club_admin(club_id) or public.is_superadmin()) with check (public.is_club_admin(club_id) or public.is_superadmin());

create policy courts_select on public.courts for select to authenticated using (public.is_club_member(club_id) or public.is_superadmin());
create policy courts_write_admin on public.courts for all to authenticated using (public.is_club_admin(club_id) or public.is_superadmin()) with check (public.is_club_admin(club_id) or public.is_superadmin());

create policy payments_select on public.payments for select to authenticated using (public.is_club_member(club_id) or public.is_superadmin());
create policy payments_write_admin on public.payments for all to authenticated using (public.is_club_admin(club_id) or public.is_superadmin()) with check (public.is_club_admin(club_id) or public.is_superadmin());

create policy events_select_member on public.events for select to authenticated using (public.is_club_member(club_id) or public.is_superadmin());
create policy events_select_public on public.events for select to anon, authenticated using (public_visible = true);
create policy events_write_admin on public.events for all to authenticated using (public.is_club_admin(club_id) or public.is_superadmin()) with check (public.is_club_admin(club_id) or public.is_superadmin());

create policy registrations_select on public.registrations for select to authenticated using (public.is_club_member(club_id) or public.is_superadmin());
create policy registrations_insert_public on public.registrations for insert to anon, authenticated with check (
  status = 'pending' and exists (
    select 1 from public.events e
    where e.id = registrations.event_id and e.club_id = registrations.club_id and e.status = 'open' and e.public_visible = true
  ));
create policy registrations_insert_staff on public.registrations for insert to authenticated with check (public.is_club_member(club_id) or public.is_superadmin());
create policy registrations_update_staff on public.registrations for update to authenticated using (public.is_club_member(club_id) or public.is_superadmin()) with check (public.is_club_member(club_id) or public.is_superadmin());
create policy registrations_delete_staff on public.registrations for delete to authenticated using (public.is_club_member(club_id) or public.is_superadmin());

create policy teams_select_member on public.teams for select to authenticated using (public.is_club_member(club_id) or public.is_superadmin());
create policy teams_select_public on public.teams for select to anon, authenticated using (exists (select 1 from public.events e where e.id = teams.event_id and e.public_visible = true));
create policy teams_write_admin on public.teams for all to authenticated using (public.is_club_admin(club_id) or public.is_superadmin()) with check (public.is_club_admin(club_id) or public.is_superadmin());

create policy zones_select_member on public.zones for select to authenticated using (public.is_club_member(club_id) or public.is_superadmin());
create policy zones_select_public on public.zones for select to anon, authenticated using (exists (select 1 from public.events e where e.id = zones.event_id and e.public_visible = true));
create policy zones_write_admin on public.zones for all to authenticated using (public.is_club_admin(club_id) or public.is_superadmin()) with check (public.is_club_admin(club_id) or public.is_superadmin());

create policy zone_teams_select_member on public.zone_teams for select to authenticated using (exists (select 1 from public.zones z where z.id = zone_teams.zone_id and (public.is_club_member(z.club_id) or public.is_superadmin())));
create policy zone_teams_select_public on public.zone_teams for select to anon, authenticated using (exists (select 1 from public.zones z join public.events e on e.id = z.event_id where z.id = zone_teams.zone_id and e.public_visible = true));
create policy zone_teams_write_admin on public.zone_teams for all to authenticated using (exists (select 1 from public.zones z where z.id = zone_teams.zone_id and (public.is_club_admin(z.club_id) or public.is_superadmin()))) with check (exists (select 1 from public.zones z where z.id = zone_teams.zone_id and (public.is_club_admin(z.club_id) or public.is_superadmin())));

create policy brackets_select_member on public.brackets for select to authenticated using (public.is_club_member(club_id) or public.is_superadmin());
create policy brackets_select_public on public.brackets for select to anon, authenticated using (exists (select 1 from public.events e where e.id = brackets.event_id and e.public_visible = true));
create policy brackets_write_admin on public.brackets for all to authenticated using (public.is_club_admin(club_id) or public.is_superadmin()) with check (public.is_club_admin(club_id) or public.is_superadmin());

create policy matches_select_member on public.matches for select to authenticated using (public.is_club_member(club_id) or public.is_superadmin());
create policy matches_select_public on public.matches for select to anon, authenticated using (exists (select 1 from public.events e where e.id = matches.event_id and e.public_visible = true));
create policy matches_write_staff on public.matches for all to authenticated using (public.is_club_member(club_id) or public.is_superadmin()) with check (public.is_club_member(club_id) or public.is_superadmin());

create policy standings_select_member on public.standings for select to authenticated using (public.is_club_member(club_id) or public.is_superadmin());
create policy standings_select_public on public.standings for select to anon, authenticated using (exists (select 1 from public.zones z join public.events e on e.id = z.event_id where z.id = standings.zone_id and e.public_visible = true));
create policy standings_write_staff on public.standings for all to authenticated using (public.is_club_member(club_id) or public.is_superadmin()) with check (public.is_club_member(club_id) or public.is_superadmin());

create policy players_select_public on public.players for select to anon, authenticated using (true);
create policy players_insert_staff on public.players for insert to authenticated with check (public.is_superadmin() or exists (select 1 from public.club_members cm where cm.profile_id = auth.uid()));
create policy players_update_owner_or_admin on public.players for update to authenticated
  using (profile_id = auth.uid() or public.is_superadmin() or exists (select 1 from public.teams t where (t.player_1_id = players.id or t.player_2_id = players.id) and public.is_club_admin(t.club_id)))
  with check (profile_id = auth.uid() or public.is_superadmin() or exists (select 1 from public.teams t where (t.player_1_id = players.id or t.player_2_id = players.id) and public.is_club_admin(t.club_id)));
create policy players_delete_superadmin on public.players for delete to authenticated using (public.is_superadmin());

create policy elo_history_select_public on public.elo_history for select to anon, authenticated using (true);;