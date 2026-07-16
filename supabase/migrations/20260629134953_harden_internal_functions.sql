-- Funciones internas / de trigger: NO deben ser invocables por RPC.
-- (Se llaman dentro de otras funciones SECURITY DEFINER, que corren como owner.)
revoke all on function public._assert_event_access(uuid) from anon, authenticated, public;
revoke all on function public._resolve_first_round_byes(uuid) from anon, authenticated, public;
revoke all on function public.handle_new_user() from anon, authenticated, public;
revoke all on function public.dev_autoconfirm_user() from anon, authenticated, public;
revoke all on function public.set_updated_at() from anon, authenticated, public;

-- Helpers de RLS: los usa el rol authenticated en las políticas; anon no los necesita.
revoke execute on function public.is_club_member(uuid) from anon, public;
revoke execute on function public.is_club_admin(uuid)  from anon, public;
revoke execute on function public.is_superadmin()      from anon, public;;