create or replace function admin_delete_club(p_club_id uuid)
returns text language plpgsql security definer set search_path=public as $$
begin
  if not is_superadmin() then
    return 'forbidden';
  end if;
  -- Bloquea si el club tiene datos importantes (eventos o reservas).
  if exists (select 1 from events where club_id = p_club_id)
     or exists (select 1 from court_bookings where club_id = p_club_id)
     or exists (select 1 from fixed_bookings where club_id = p_club_id) then
    return 'has_data';
  end if;
  -- Limpieza de dependencias livianas (config del club) y desvinculacion.
  update players set home_club_id = null where home_club_id = p_club_id;
  update club_leads set converted_club_id = null where converted_club_id = p_club_id;
  delete from categories where club_id = p_club_id;
  delete from club_payment_settings where club_id = p_club_id;
  delete from club_members where club_id = p_club_id;
  delete from courts where club_id = p_club_id;
  delete from clubs where id = p_club_id;
  return 'ok';
end;
$$;

grant execute on function admin_delete_club(uuid) to authenticated;;