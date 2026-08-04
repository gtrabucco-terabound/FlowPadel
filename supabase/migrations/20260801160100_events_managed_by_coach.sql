alter table events add column if not exists managed_by_coach_id uuid references coaches(id) on delete set null;
