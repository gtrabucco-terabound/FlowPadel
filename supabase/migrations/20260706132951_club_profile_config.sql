-- Datos de contacto/perfil del club
alter table public.clubs
  add column if not exists contact_email text,
  add column if not exists description   text,
  add column if not exists instagram     text,
  add column if not exists website       text;

-- El admin del club puede actualizar su propio club (además del superadmin)
drop policy if exists clubs_update_admin on public.clubs;
create policy clubs_update_admin on public.clubs for update
  using ( public.is_club_admin(id) )
  with check ( public.is_club_admin(id) );

-- Bucket público para logos de club
insert into storage.buckets (id, name, public) values ('club-logos','club-logos', true)
  on conflict (id) do nothing;

drop policy if exists club_logos_read on storage.objects;
create policy club_logos_read on storage.objects for select
  using ( bucket_id = 'club-logos' );

drop policy if exists club_logos_write on storage.objects;
create policy club_logos_write on storage.objects for insert to authenticated
  with check ( bucket_id = 'club-logos' );

drop policy if exists club_logos_update on storage.objects;
create policy club_logos_update on storage.objects for update to authenticated
  using ( bucket_id = 'club-logos' );;