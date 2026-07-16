-- ===== FASE 3: pagos separados (inscripción vs cancha) + pozo =====
create type payment_kind as enum ('inscription','court_fee');
alter table public.payments
  add column if not exists kind payment_kind not null default 'inscription',
  add column if not exists pool_amount numeric(12,2) not null default 0;  -- porción markup → pozo (solo en court_fee)
comment on column public.payments.kind is 'inscription = 100% ganancia organizador; court_fee = cuota de cancha (incluye markup que va al pozo).';
comment on column public.payments.pool_amount is 'Parte de este pago que va al pozo de premios (el markup). 0 para inscripción.';

-- Cuota de cancha por persona (calculada y guardada desde el Planificador) y su porción de pozo.
alter table public.events
  add column if not exists court_fee_per_person  numeric(12,2) not null default 0,
  add column if not exists court_pool_per_person numeric(12,2) not null default 0;

-- ===== FASE 4: interclub =====
alter table public.events
  add column if not exists is_interclub  boolean not null default false,
  add column if not exists rival_club_id uuid references public.clubs(id) on delete set null,
  add column if not exists rival_accepted boolean not null default false;
comment on column public.events.is_interclub is 'Torneo entre dos clubes: club organizador (club_id) vs rival_club_id.';;