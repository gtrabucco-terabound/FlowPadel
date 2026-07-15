drop function if exists public.get_registration_claim(text);
create function public.get_registration_claim(p_code text)
returns table(event_name text, event_slug text, club_id uuid, inviter_name text, partner_name text, already_claimed boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select e.name, e.slug, r.club_id, r.player_1_name, r.player_2_name,
         (r.player_2_id is not null
           and exists(select 1 from public.players p where p.id = r.player_2_id and p.profile_id is not null)) as already_claimed
  from public.registrations r
  join public.events e on e.id = r.event_id
  where r.partner_claim_code = p_code;
$$;
revoke all on function public.get_registration_claim(text) from public;
grant execute on function public.get_registration_claim(text) to anon, authenticated;;