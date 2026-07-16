alter table public.courts
  add column if not exists number          smallint,
  add column if not exists enclosure_type   text check (enclosure_type in ('blindex','muro','mixta')),
  add column if not exists surface          text check (surface in ('cesped_sintetico','cemento','otro')),
  add column if not exists covered          boolean not null default false,
  add column if not exists lighting         boolean not null default true,
  add column if not exists panoramic        boolean not null default false,
  add column if not exists rental_price_hour numeric,
  add column if not exists operating_days   smallint[] not null default '{1,2,3,4,5,6,7}',
  add column if not exists open_hour        smallint not null default 8 check (open_hour between 0 and 24),
  add column if not exists close_hour       smallint not null default 24 check (close_hour between 0 and 24);;