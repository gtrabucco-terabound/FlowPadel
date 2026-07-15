-- Equipos efímeros: en el americano las parejas cambian cada ronda, así que se
-- crean equipos por ronda marcados como ephemeral (para borrarlos al regenerar
-- sin tocar los equipos reales de inscripción).
alter table public.teams add column if not exists ephemeral boolean not null default false;
comment on column public.teams.ephemeral is 'true = pareja efímera de americano (generada por ronda); se borra al regenerar el fixture.';;