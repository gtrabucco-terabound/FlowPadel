-- 1) Al crear un usuario en auth, crear su profile automaticamente (patron estandar Supabase).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, email, full_name, global_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'player'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) DEV ONLY: auto-confirmar email en signup (no hay SMTP en el proyecto demo).
--    Para PRODUCCION: quitar este trigger y habilitar "Confirm email" en Auth settings.
create or replace function public.dev_autoconfirm_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  -- normalizar columnas de token a '' para que GoTrue no falle al escanear NULLs
  new.confirmation_token := coalesce(new.confirmation_token, '');
  new.recovery_token := coalesce(new.recovery_token, '');
  new.email_change := coalesce(new.email_change, '');
  new.email_change_token_new := coalesce(new.email_change_token_new, '');
  return new;
end;
$$;

drop trigger if exists dev_autoconfirm on auth.users;
create trigger dev_autoconfirm
  before insert on auth.users
  for each row execute function public.dev_autoconfirm_user();

-- 3) Arreglar la cuenta existente del owner: confirmar + profile superadmin + miembro de Club Norte.
update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'gtrabucco@terabound.com';

insert into public.profiles (id, email, full_name, global_role)
select id, email, 'German Trabucco', 'superadmin' from auth.users where email = 'gtrabucco@terabound.com'
on conflict (id) do update set global_role = 'superadmin';

insert into public.club_members (club_id, profile_id, role)
select '11111111-1111-1111-1111-111111111111', id, 'club_admin' from auth.users where email = 'gtrabucco@terabound.com'
on conflict (club_id, profile_id) do nothing;;