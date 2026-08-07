-- Línea privada de WhatsApp por club (tier "Marca propia").
-- Cada club puede tener su propia instancia de Evolution (su número), en vez de
-- compartir el número general de FlowPadel.

-- 1) Flag de plan que habilita la feature.
alter table public.plans
  add column if not exists f_private_line boolean not null default false;

-- El plan tope ("Oro") incluye la línea privada.
update public.plans set f_private_line = true where name = 'Oro';

-- 2) Instancia de WhatsApp por club (1:1). El nombre de instancia identifica la
--    sesión en Evolution; el número se completa cuando el club escanea el QR.
create table if not exists public.club_whatsapp_instances (
  club_id            uuid primary key references public.clubs(id) on delete cascade,
  instance_name      text not null unique,
  phone              text,
  status             text not null default 'pending'
                     check (status in ('pending', 'connecting', 'connected', 'disconnected')),
  last_connected_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.club_whatsapp_instances enable row level security;

-- Miembros del club (y superadmin) pueden ver su instancia.
drop policy if exists cwi_select on public.club_whatsapp_instances;
create policy cwi_select on public.club_whatsapp_instances
  for select using (public.is_club_member(club_id) or public.is_superadmin());

-- Solo el admin del club (o superadmin) puede crear/actualizar/borrar.
drop policy if exists cwi_write on public.club_whatsapp_instances;
create policy cwi_write on public.club_whatsapp_instances
  for all using (public.is_club_admin(club_id) or public.is_superadmin())
  with check (public.is_club_admin(club_id) or public.is_superadmin());
