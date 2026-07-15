-- Género y modalidad/categorías
create type gender as enum ('male','female');
create type tournament_modality as enum ('caballeros','damas','mixto','combinado');
create type category_system as enum ('fixed','suma');

-- Jugadores: género + categoría individual (1ra=1 mejor … 9na=9)
alter table public.players
  add column if not exists gender   gender,
  add column if not exists category smallint;
alter table public.players add constraint players_category_range check (category is null or (category between 1 and 9));
comment on column public.players.category is 'Categoría individual: 1=1ra (mejor) … 9=9na (principiante).';

-- Evento: modalidad + sistema de categoría
alter table public.events
  add column if not exists modality        tournament_modality,
  add column if not exists category_system category_system,   -- fixed (ej "4ta") | suma (10/12/13/14/15)
  add column if not exists category_value  text;              -- '4ta' (fija) o '13' (suma)
comment on column public.events.modality is 'caballeros (2H) | damas (2M) | mixto (1H+1M) | combinado (varias en un evento, con zonas por modalidad).';
comment on column public.events.category_system is 'fixed = categoría fija (ej 4ta); suma = la pareja suma un valor (10/12/13/14/15).';

-- Inscripción: capturar género/categoría de cada jugador + (para combinado) la modalidad elegida
alter table public.registrations
  add column if not exists modality          tournament_modality,
  add column if not exists player_1_gender   gender,
  add column if not exists player_1_category smallint,
  add column if not exists player_2_gender   gender,
  add column if not exists player_2_category smallint;

-- Zonas: etiqueta de modalidad + categoría (para torneos combinados con filtros)
alter table public.zones
  add column if not exists modality       tournament_modality,
  add column if not exists category_value text;;