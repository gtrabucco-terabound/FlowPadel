-- Formato de torneo largo (null = torneo corto clásico). Fase 1 lo usa para contar partidos.
create type tournament_format as enum ('liga_ida','liga_ida_vuelta','liga_playoff','americano');

alter table public.events
  add column if not exists long_format            tournament_format,           -- null = torneo corto
  add column if not exists court_cost_month        numeric(12,2) not null default 0,    -- costo cancha por mes
  add column if not exists matches_per_court_month integer       not null default 4,    -- partidos que cubre 1 cancha/mes
  add column if not exists markup_pct              numeric(6,2)  not null default 40,    -- markup % sobre la cancha
  add column if not exists inscription_per_person  numeric(12,2) not null default 0;    -- inscripción por persona (100% ganancia)

comment on column public.events.long_format is 'Formato de liga larga; null = torneo corto (grupos+eliminación clásico).';
comment on column public.events.court_cost_month is 'Costo de alquiler de una cancha por mes (insumo del motor económico).';
comment on column public.events.matches_per_court_month is 'Partidos que cubre 1 cancha alquilada por mes (ej. 4 = 1/semana).';
comment on column public.events.markup_pct is 'Markup % aplicado sobre el costo de cancha; arma el pozo de premios.';
comment on column public.events.inscription_per_person is 'Inscripción por persona; 100% ganancia del organizador.';;