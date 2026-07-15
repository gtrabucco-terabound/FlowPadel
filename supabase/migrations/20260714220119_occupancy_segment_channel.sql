-- Canal segmentado del motor de ocupación: config por club + log anti-duplicados.
alter table club_occupancy
  add column if not exists segment_enabled      boolean not null default false,
  add column if not exists segment_min_matches  integer not null default 3,   -- jugadores "fieles": al menos N partidos
  add column if not exists segment_inactive_days integer not null default 21, -- jugadores "dormidos": sin reservar hace N días
  add column if not exists segment_discount_pct integer not null default 20,  -- descuento de la invitación dirigida
  add column if not exists segment_max_per_run  integer not null default 15;  -- tope de invitaciones por corrida (anti-spam)

-- Log de invitaciones enviadas (dedupe: 1 por jugador por día).
create table if not exists player_offer_invites (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references clubs(id) on delete cascade,
  player_id    uuid not null references players(id) on delete cascade,
  invite_date  date not null,
  discount_pct integer,
  sent_at      timestamptz not null default now(),
  unique (player_id, invite_date)
);

alter table player_offer_invites enable row level security;

-- Sólo el club (admin/miembros) ve su propio historial de invitaciones.
drop policy if exists poi_select_club on player_offer_invites;
create policy poi_select_club on player_offer_invites
  for select using (is_club_member(club_id));
;