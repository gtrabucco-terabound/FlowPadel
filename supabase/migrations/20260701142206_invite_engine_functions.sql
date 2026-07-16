create or replace function public.upsert_club_lead(p_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_norm text; v_id uuid;
begin
  v_norm := lower(btrim(p_name));
  if v_norm = '' or v_norm is null then return null; end if;
  if exists (select 1 from clubs where lower(btrim(name)) = v_norm) then
    return null;
  end if;
  insert into club_leads (name, name_norm, mention_count)
    values (btrim(p_name), v_norm, 1)
  on conflict (name_norm)
    do update set mention_count = club_leads.mention_count + 1, updated_at = now()
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.generate_event_invites(p_event_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_ev record; v_count integer;
begin
  select id, modality, category_system, category_value, club_id
    into v_ev from events where id = p_event_id;
  if not found then return 0; end if;

  with eligible as (
    select p.id as player_id
    from players p
    where p.notify_enabled = true
      and p.gender is not null
      and (
        v_ev.modality = 'combinado'
        or (v_ev.modality = 'caballeros' and p.gender = 'male')
        or (v_ev.modality = 'damas'      and p.gender = 'female')
        or (v_ev.modality = 'mixto'      and p.notify_mixto = true)
      )
      and (
        v_ev.category_system is distinct from 'category'
        or v_ev.category_value is null
        or p.category = v_ev.category_value
      )
      and not exists (
        select 1 from team_players tp
        join teams t on t.id = tp.team_id
        where t.event_id = p_event_id and tp.player_id = p.id
      )
  )
  insert into tournament_invites (event_id, player_id, channel, status, reason)
  select p_event_id, player_id, 'email', 'queued', 'auto:modality='||v_ev.modality
  from eligible
  on conflict (event_id, player_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.upsert_club_lead(text) from public, anon, authenticated;
revoke all on function public.generate_event_invites(uuid) from public, anon, authenticated;

drop policy if exists club_leads_read on public.club_leads;
create policy club_leads_read on public.club_leads for select
  using ( public.is_superadmin() or exists (select 1 from club_members cm where cm.profile_id = auth.uid()) );

drop policy if exists invites_read on public.tournament_invites;
create policy invites_read on public.tournament_invites for select
  using ( public.is_superadmin() or public.is_club_member((select club_id from events where id = event_id)) );;