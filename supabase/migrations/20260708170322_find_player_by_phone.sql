create or replace function find_player_by_phone(p_phone text)
returns table (id uuid, full_name text, phone text, email text)
language sql
security definer
set search_path = public
as $$
  with norm as (
    select right(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), 10) as d
  )
  select p.id, p.full_name, p.phone, p.email::text
  from players p, norm
  where length(norm.d) >= 8
    and right(regexp_replace(coalesce(p.phone,''), '\D', '', 'g'), 10) = norm.d
  limit 1;
$$;

grant execute on function find_player_by_phone(text) to authenticated;;