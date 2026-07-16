-- Un jugador autenticado puede crear su PROPIA fila de player (vinculada a su perfil).
-- (Antes solo staff/admin podían insertar players.)
create policy players_insert_self on public.players
  for insert to authenticated
  with check (profile_id = auth.uid());;