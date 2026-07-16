-- 1) RLS en bot_sessions (solo las funciones SECURITY DEFINER acceden; API directa denegada)
alter table bot_sessions enable row level security;

-- 2) Funciones de admin/torneo: NO deben ser llamables por anon (solo un admin logueado).
do $$
declare r record;
begin
  for r in
    select oid::regprocedure as sig
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in (
        'admin_create_club','admin_delete_club','add_club_member','accept_interclub',
        'operator_decide','club_operator_pending','list_club_members',
        'generate_americano','generate_bracket','generate_division_zones',
        'generate_group_matches','generate_league','generate_event_invites',
        'apply_elo_for_match','notify_registration_status'
      )
  loop
    execute format('revoke execute on function %s from anon', r.sig);
  end loop;
end $$;;