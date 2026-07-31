-- Precio de referencia de 1 hora de cancha (para el ejemplo de accesibilidad en la landing).
alter table platform_settings
  add column if not exists ref_court_hour_price numeric not null default 65000;
