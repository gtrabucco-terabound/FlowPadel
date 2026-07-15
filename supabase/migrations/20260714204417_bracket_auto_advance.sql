-- Al cargar el ganador de un partido del cuadro, lo mete solo en el partido
-- siguiente (slot impar -> team_a, slot par -> team_b). Idempotente.
create or replace function advance_bracket_winner()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if NEW.bracket_id is not null
     and NEW.next_match_id is not null
     and NEW.winner_team_id is not null
     and NEW.winner_team_id is distinct from OLD.winner_team_id then
    if NEW.bracket_slot % 2 = 1 then
      update public.matches set team_a_id = NEW.winner_team_id, updated_at = now()
        where id = NEW.next_match_id;
    else
      update public.matches set team_b_id = NEW.winner_team_id, updated_at = now()
        where id = NEW.next_match_id;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_advance_bracket on matches;
create trigger trg_advance_bracket
  after update of winner_team_id on public.matches
  for each row execute function advance_bracket_winner();;