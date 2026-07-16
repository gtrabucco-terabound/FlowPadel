alter table public.players
  add column if not exists receive_offers boolean not null default true;;