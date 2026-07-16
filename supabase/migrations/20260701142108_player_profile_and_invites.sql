-- 1) Campos de perfil del jugador (identidad padelística vive en players)
alter table public.players
  add column if not exists first_name    text,
  add column if not exists birthdate     date,
  add column if not exists hand          text check (hand in ('drive','reves')),
  add column if not exists photo_url      text,
  add column if not exists notify_enabled boolean not null default true,   -- opt-in avisos de torneos
  add column if not exists notify_mixto   boolean not null default false,  -- ademas de su genero, avisar de mixto
  add column if not exists club_lead_id   uuid;                            -- club que nombro pero no esta registrado

-- 2) CRM encubierto: clubes nombrados por jugadores que aun no estan en FlowPadel
create table if not exists public.club_leads (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  name_norm     text not null unique,           -- para dedupe (lower/trim)
  mention_count integer not null default 0,
  converted_club_id uuid references public.clubs(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.players
  drop constraint if exists players_club_lead_id_fkey,
  add constraint players_club_lead_id_fkey
    foreign key (club_lead_id) references public.club_leads(id) on delete set null;

-- 3) Cola de invitaciones automaticas a torneos
create table if not exists public.tournament_invites (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  channel     text not null default 'email' check (channel in ('email','whatsapp','push')),
  status      text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  reason      text,                              -- por que fue elegible (log)
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  unique (event_id, player_id)
);
create index if not exists idx_tournament_invites_event on public.tournament_invites(event_id);

alter table public.club_leads enable row level security;
alter table public.tournament_invites enable row level security;;