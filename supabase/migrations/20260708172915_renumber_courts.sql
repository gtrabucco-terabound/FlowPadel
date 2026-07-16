-- Renumera las canchas por club, secuencial segun antiguedad (arregla duplicados)
with ranked as (
  select id,
         row_number() over (partition by club_id order by created_at, id) as rn
  from courts
)
update courts c
   set number = r.rn
  from ranked r
 where c.id = r.id
   and (c.number is distinct from r.rn);;