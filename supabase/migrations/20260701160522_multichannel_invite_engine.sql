-- La cola externa admite telegram y permite 1 fila por canal
alter table public.tournament_invites drop constraint if exists tournament_invites_event_id_player_id_key;
alter table public.tournament_invites drop constraint if exists tournament_invites_channel_check;
alter table public.tournament_invites
  add constraint tournament_invites_channel_check
  check (channel in ('email','whatsapp','telegram','push'));
create unique index if not exists uq_tournament_invites_ev_pl_ch
  on public.tournament_invites(event_id, player_id, channel);

create or replace function public.generate_event_invites(p_event_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_ev record; v_count integer;
begin
  select id, name, slug, modality, category_system, category_value, club_id
    into v_ev from events where id = p_event_id;
  if not found then return 0; end if;

  if not (public.is_superadmin() or public.is_club_member(v_ev.club_id)) then
    raise exception 'no autorizado';
  end if;

  -- Jugadores elegibles: opt-in + género según modalidad + categoría + no inscriptos
  create temporary table _elig on commit drop as
  select p.id as player_id, p.notify_inapp, p.notify_email, p.notify_telegram, p.notify_whatsapp
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
      select 1 from team_players tp join teams t on t.id = tp.team_id
      where t.event_id = p_event_id and tp.player_id = p.id
    );

  -- 1) Notificación in-app (siempre, salvo que el jugador la haya apagado)
  insert into notifications (player_id, type, title, body, url, event_id)
  select e.player_id, 'tournament_invite',
         'Nuevo torneo para vos',
         'Se abrió "'||v_ev.name||'". Tocá para inscribirte.',
         '/event/'||v_ev.slug, p_event_id
  from _elig e
  where e.notify_inapp
    and not exists (
      select 1 from notifications n
      where n.player_id = e.player_id and n.event_id = p_event_id
        and n.type = 'tournament_invite'
    );

  -- 2) Cola externa por canal habilitado (email / telegram / whatsapp)
  insert into tournament_invites (event_id, player_id, channel, status, reason)
  select p_event_id, e.player_id, c.channel, 'queued', 'auto:modality='||v_ev.modality
  from _elig e
  cross join lateral (values
      ('email', e.notify_email),
      ('telegram', e.notify_telegram),
      ('whatsapp', e.notify_whatsapp)
  ) as c(channel, enabled)
  where c.enabled
  on conflict (event_id, player_id, channel) do nothing;

  select count(*) into v_count from _elig;
  return v_count;
end $$;

grant execute on function public.generate_event_invites(uuid) to authenticated;;