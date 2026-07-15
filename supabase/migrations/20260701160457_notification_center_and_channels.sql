-- Preferencias de canal por jugador (notify_enabled = master opt-in ya existe)
alter table public.players
  add column if not exists notify_inapp    boolean not null default true,
  add column if not exists notify_email    boolean not null default true,
  add column if not exists notify_telegram boolean not null default false,
  add column if not exists notify_whatsapp boolean not null default false,
  add column if not exists telegram_chat_id text;

-- Centro de notificaciones in-app (feed que el jugador ve en la campanita)
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references public.players(id) on delete cascade,
  type       text not null default 'system',
  title      text not null,
  body       text,
  url        text,
  event_id   uuid references public.events(id) on delete set null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_player on public.notifications(player_id, created_at desc);

alter table public.notifications enable row level security;

-- El jugador ve y marca leídas SÓLO sus propias notificaciones
drop policy if exists notifications_own_select on public.notifications;
create policy notifications_own_select on public.notifications for select
  using ( player_id in (select id from public.players where profile_id = auth.uid()) );

drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications for update
  using ( player_id in (select id from public.players where profile_id = auth.uid()) )
  with check ( player_id in (select id from public.players where profile_id = auth.uid()) );;