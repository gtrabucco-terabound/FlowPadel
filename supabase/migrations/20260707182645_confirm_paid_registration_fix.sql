create or replace function public.confirm_paid_registration(p_registration_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r record; e record; v_p1 uuid; v_p2 uuid; v_team uuid;
  v_team_mod tournament_modality; v_players int; v_name text;
begin
  select * into r from registrations where id = p_registration_id;
  if not found then return; end if;

  if r.status = 'approved' and r.team_id is not null then
    update registrations set deposit_paid_at = coalesce(deposit_paid_at, now())
      where id = p_registration_id;
    return;
  end if;

  select id, club_id, modality, category_value, currency, inscription_per_person,
         charge_court, court_fee_per_person, court_pool_per_person
    into e from events where id = r.event_id;

  v_p1 := r.player_1_id;
  if v_p1 is null and r.player_1_name is not null then
    if nullif(btrim(coalesce(r.player_1_phone,'')),'') is not null then
      select id into v_p1 from players where phone = btrim(r.player_1_phone) limit 1;
    end if;
    if v_p1 is null then
      insert into players (full_name, phone, home_club_id, gender, category)
        values (btrim(r.player_1_name), nullif(btrim(coalesce(r.player_1_phone,'')),''),
                e.club_id, r.player_1_gender, r.player_1_category)
        returning id into v_p1;
    end if;
  end if;

  v_p2 := r.player_2_id;
  if v_p2 is null and nullif(btrim(coalesce(r.player_2_name,'')),'') is not null then
    if nullif(btrim(coalesce(r.player_2_phone,'')),'') is not null then
      select id into v_p2 from players where phone = btrim(r.player_2_phone) limit 1;
    end if;
    if v_p2 is null then
      insert into players (full_name, phone, home_club_id, gender, category)
        values (btrim(r.player_2_name), nullif(btrim(coalesce(r.player_2_phone,'')),''),
                e.club_id, r.player_2_gender, r.player_2_category)
        returning id into v_p2;
    end if;
  end if;

  v_team_mod := case when e.modality = 'combinado' then r.modality else e.modality end;
  v_name := case when nullif(btrim(coalesce(r.player_2_name,'')),'') is not null
                 then r.player_1_name || ' / ' || r.player_2_name
                 else r.player_1_name end;

  insert into teams (club_id, event_id, name, player_1_id, player_2_id, modality, category_value)
    values (e.club_id, r.event_id, v_name, v_p1, v_p2, v_team_mod, e.category_value)
    returning id into v_team;

  update registrations
    set status='approved', team_id=v_team, player_1_id=v_p1, player_2_id=v_p2,
        waitlist_position=null, deposit_paid_at=coalesce(deposit_paid_at, now())
    where id = p_registration_id;

  v_players := case when nullif(btrim(coalesce(r.player_2_name,'')),'') is not null then 2 else 1 end;

  if not exists (select 1 from payments where registration_id=p_registration_id and kind='inscription') then
    insert into payments (club_id, event_id, registration_id, kind, amount, pool_amount, currency, status, provider, paid_at)
    values (e.club_id, r.event_id, p_registration_id, 'inscription',
      coalesce(e.inscription_per_person,0)*v_players, 0, e.currency,
      (case when coalesce(e.inscription_per_person,0)=0 then 'paid' else 'pending' end)::payment_status,
      'cash', case when coalesce(e.inscription_per_person,0)=0 then now() else null end);
  end if;

  if e.charge_court and not exists (select 1 from payments where registration_id=p_registration_id and kind='court_fee') then
    insert into payments (club_id, event_id, registration_id, kind, amount, pool_amount, currency, status, provider, paid_at)
    values (e.club_id, r.event_id, p_registration_id, 'court_fee',
      coalesce(e.court_fee_per_person,0)*v_players, coalesce(e.court_pool_per_person,0)*v_players, e.currency,
      (case when coalesce(e.court_fee_per_person,0)=0 then 'paid' else 'pending' end)::payment_status,
      'cash', case when coalesce(e.court_fee_per_person,0)=0 then now() else null end);
  end if;
end $$;
revoke all on function public.confirm_paid_registration(uuid) from public, anon, authenticated;;