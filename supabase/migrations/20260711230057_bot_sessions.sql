create table if not exists bot_sessions (
  phone text primary key,
  step text not null default 'MENU',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Leer la sesion de un numero (crea vacia si no existe). Devuelve {step, data}.
create or replace function bot_get_session(p_phone text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_step text; v_data jsonb;
begin
  select step, data into v_step, v_data from bot_sessions where phone=p_phone;
  if not found then
    return jsonb_build_object('step','NEW','data','{}'::jsonb);
  end if;
  return jsonb_build_object('step', v_step, 'data', v_data);
end;
$$;

-- Guardar el paso + datos de contexto de un numero.
create or replace function bot_set_session(p_phone text, p_step text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  insert into bot_sessions (phone, step, data, updated_at)
  values (p_phone, p_step, coalesce(p_data,'{}'::jsonb), now())
  on conflict (phone) do update
    set step=excluded.step, data=excluded.data, updated_at=now();
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function bot_get_session(text) to anon, authenticated;
grant execute on function bot_set_session(text,text,jsonb) to anon, authenticated;;