alter table public.courts rename column rental_price_hour to price_per_slot;
alter table public.courts
  add column if not exists slot_minutes smallint not null default 90
    check (slot_minutes between 30 and 240);;