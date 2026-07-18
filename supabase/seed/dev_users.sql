-- Usuarios de prueba para DEV (NO producción). Idempotente.
-- El proyecto DEV no tiene SMTP usable, así que se siembran con email ya
-- confirmado y bcrypt (pgcrypto). El trigger handle_new_user crea el profile.
-- Credenciales DEV descartables (proyecto Free aislado):
--   qa.player@example.com  / DevPass123!   (jugador)
--   qa.admin@example.com   / DevPass123!   (club_admin de Club Demo DEV)
--   qa.adminb@example.com  / DevPass123!   (club_admin de Club Demo B — test de aislamiento RLS)
do $$
declare
  v_club_a uuid;
  v_club_b uuid;
  v_player uuid := gen_random_uuid();
  v_admin_a uuid := gen_random_uuid();
  v_admin_b uuid := gen_random_uuid();
begin
  select id into v_club_a from clubs where slug = 'club-demo-dev';
  insert into clubs (name, slug, city) values ('Club Demo B', 'club-demo-b', 'Córdoba')
  on conflict (slug) do nothing;
  select id into v_club_b from clubs where slug = 'club-demo-b';

  if not exists (select 1 from auth.users where email = 'qa.player@example.com') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', v_player, 'authenticated', 'authenticated',
      'qa.player@example.com', crypt('DevPass123!', gen_salt('bf')), now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"QA Player"}', '', '', '', '');
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_player, jsonb_build_object('sub', v_player::text, 'email', 'qa.player@example.com'), 'email', v_player::text, now(), now(), now());
  end if;

  if not exists (select 1 from auth.users where email = 'qa.admin@example.com') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', v_admin_a, 'authenticated', 'authenticated',
      'qa.admin@example.com', crypt('DevPass123!', gen_salt('bf')), now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"QA Admin A"}', '', '', '', '');
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_admin_a, jsonb_build_object('sub', v_admin_a::text, 'email', 'qa.admin@example.com'), 'email', v_admin_a::text, now(), now(), now());
    insert into public.club_members (club_id, profile_id, role) values (v_club_a, v_admin_a, 'club_admin')
    on conflict (club_id, profile_id) do nothing;
  end if;

  if not exists (select 1 from auth.users where email = 'qa.adminb@example.com') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', v_admin_b, 'authenticated', 'authenticated',
      'qa.adminb@example.com', crypt('DevPass123!', gen_salt('bf')), now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"QA Admin B"}', '', '', '', '');
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_admin_b, jsonb_build_object('sub', v_admin_b::text, 'email', 'qa.adminb@example.com'), 'email', v_admin_b::text, now(), now(), now());
    insert into public.club_members (club_id, profile_id, role) values (v_club_b, v_admin_b, 'club_admin')
    on conflict (club_id, profile_id) do nothing;
  end if;

  -- Para que el club figure en /reservar la RPC exige canchas con precio > 0
  -- y un mp_access_token no nulo. Con pay-at-club activo, el token dummy no se
  -- usa (la reserva confirma sin Mercado Pago).
  update courts set price_per_slot = 12000 where club_id = v_club_a and price_per_slot is null;
  insert into club_payment_settings (club_id, booking_pay_at_club, mp_access_token)
  values (v_club_a, true, 'DEV-DUMMY-TOKEN')
  on conflict (club_id) do update set booking_pay_at_club = true, mp_access_token = 'DEV-DUMMY-TOKEN';

  -- Torneo abierto y visible para los E2E de torneo (evento público + inscripción).
  if not exists (select 1 from events where slug = 'torneo-qa-abierto') then
    insert into events (club_id, name, slug, event_type, status, public_visible,
      modality, category_system, category_value, deposit_type)
    values (v_club_a, 'Torneo QA Abierto', 'torneo-qa-abierto', 'tournament', 'open',
      true, 'caballeros', 'fixed', '7ma', 'none');
  end if;
end $$;
