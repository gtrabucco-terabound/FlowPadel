-- Tracking de origen de las reservas de cancha.
-- Permite medir cuántas reservas genera el bot de WhatsApp vs. la carga manual
-- vs. la reserva web pública. Alimenta los KPIs del tablero de Inicio.

-- 1) Columna de origen. Default 'manual' porque la mayoría de altas históricas
--    fueron cargadas a mano desde el panel.
alter table public.court_bookings
  add column if not exists source text not null default 'manual';

alter table public.court_bookings
  drop constraint if exists court_bookings_source_check;
alter table public.court_bookings
  add constraint court_bookings_source_check
  check (source in ('manual', 'bot', 'web', 'fixed', 'tournament', 'class'));

-- 2) Backfill de lo que sí podemos inferir por su naturaleza.
update public.court_bookings set source = 'fixed'
  where kind = 'fixed' and source = 'manual';
update public.court_bookings set source = 'tournament'
  where kind = 'tournament' and source = 'manual';

-- 3) create_public_hold ahora acepta el origen. La web pública queda como 'web'
--    (default); el bot de WhatsApp debe pasar p_source => 'bot' desde n8n.
--    Se elimina la firma vieja de 6 args y se recrea con el parámetro opcional,
--    así las llamadas de 6 args existentes siguen funcionando (usan el default).
drop function if exists public.create_public_hold(text, uuid, date, int, text, text);

create or replace function public.create_public_hold(
  p_slug text, p_court_id uuid, p_date date, p_start int, p_name text, p_phone text,
  p_source text default 'web'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_club uuid; v_price numeric; v_slot int; v_id uuid; v_src text;
begin
  v_src := case when p_source in ('bot', 'web') then p_source else 'web' end;
  select id into v_club from clubs where slug = p_slug and is_active;
  if v_club is null then return jsonb_build_object('ok', false, 'error', 'Club no disponible.'); end if;
  select price_per_slot, slot_minutes into v_price, v_slot
    from courts where id = p_court_id and club_id = v_club and is_active;
  if not found then return jsonb_build_object('ok', false, 'error', 'Cancha no válida.'); end if;
  if coalesce(v_price, 0) <= 0 then return jsonb_build_object('ok', false, 'error', 'La cancha no tiene precio configurado.'); end if;
  if length(coalesce(trim(p_name), '')) < 2 then return jsonb_build_object('ok', false, 'error', 'Ingresá tu nombre.'); end if;
  if exists (
    select 1 from court_bookings b
    where b.court_id = p_court_id and b.booking_date = p_date and b.status <> 'cancelled'
      and p_start < b.start_minutes + b.slot_minutes and p_start + v_slot > b.start_minutes
  ) then
    return jsonb_build_object('ok', false, 'error', 'Ese turno ya no está disponible.');
  end if;
  insert into court_bookings(club_id, court_id, booking_date, start_minutes, slot_minutes,
    status, kind, customer_name, customer_phone, price, hold_expires_at, source)
  values (v_club, p_court_id, p_date, p_start, v_slot, 'held', 'casual',
    trim(p_name), nullif(trim(p_phone), ''), v_price, now() + interval '30 minutes', v_src)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

grant execute on function public.create_public_hold(text, uuid, date, int, text, text, text)
  to anon, authenticated;
