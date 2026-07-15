alter table public.events add column if not exists flyer_image_url text;

insert into storage.buckets (id, name, public) values ('event-flyers','event-flyers', true)
  on conflict (id) do nothing;

drop policy if exists event_flyers_read on storage.objects;
create policy event_flyers_read on storage.objects for select
  using ( bucket_id = 'event-flyers' );

drop policy if exists event_flyers_write on storage.objects;
create policy event_flyers_write on storage.objects for insert to authenticated
  with check ( bucket_id = 'event-flyers' );

drop policy if exists event_flyers_update on storage.objects;
create policy event_flyers_update on storage.objects for update to authenticated
  using ( bucket_id = 'event-flyers' );;