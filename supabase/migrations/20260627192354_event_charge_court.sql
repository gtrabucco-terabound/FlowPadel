alter table public.events
  add column if not exists charge_court boolean not null default true;
comment on column public.events.charge_court is
  'Si true, se cobra la cuota de cancha (con markup) además de la inscripción. En torneos de un día con cancha propia suele ir en false → solo inscripción.';;