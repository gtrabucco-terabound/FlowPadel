-- Politica de cobro de reservas por club (analoga a la sena de torneos)
alter table club_payment_settings
  add column if not exists booking_charge_type text not null default 'full'
    check (booking_charge_type in ('full','percent','fixed')),
  add column if not exists booking_charge_value numeric;

-- Guardamos el link de MP y el monto cobrado online en la propia reserva
alter table court_bookings
  add column if not exists checkout_url text,
  add column if not exists amount_charged numeric;;