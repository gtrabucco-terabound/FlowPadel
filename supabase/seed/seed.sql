-- Seed mínimo para entorno DEV (A1-R3 / A3-R2).
-- Idempotente: se puede correr varias veces. NO usar en producción.
do $$
declare v_club uuid;
begin
  insert into clubs (name, slug, city)
  values ('Club Demo DEV', 'club-demo-dev', 'Buenos Aires')
  on conflict (slug) do update set city = excluded.city
  returning id into v_club;

  if not exists (select 1 from courts where club_id = v_club) then
    insert into courts (club_id, name, number) values
      (v_club, 'Cancha 1', 1),
      (v_club, 'Cancha 2', 2),
      (v_club, 'Cancha 3', 3);
  end if;

  if not exists (select 1 from categories where club_id = v_club) then
    insert into categories (club_id, name) values
      (v_club, '4ta'),
      (v_club, '5ta'),
      (v_club, '6ta');
  end if;
end $$;
