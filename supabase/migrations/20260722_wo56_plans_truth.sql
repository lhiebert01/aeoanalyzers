-- WO-5 truth-record baseline + WO-6 stateful action plans. Run in Supabase SQL editor.

-- WO-5: the approved truth record per domain (drift is measured against this).
create table if not exists public.truth_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  domain      text not null unique,
  approved    jsonb not null,           -- TruthRecord snapshot
  approved_at timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- WO-6: a persisted, stateful implementation plan per client/domain.
create table if not exists public.action_plans (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid,
  domain              text not null,
  -- tasks: [{ id, title, priority, category (ENTITY|SCHEMA|CONTENT|AUTHORITY|GEO),
  --           execution (MANUAL|HYBRID|AUTO), done, completed_at }]
  tasks               jsonb not null default '[]'::jsonb,
  generation_cost_usd numeric(10,4) not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_truth_records_user on public.truth_records (user_id);
create index if not exists idx_action_plans_user_domain on public.action_plans (user_id, domain);

alter table public.truth_records enable row level security;
alter table public.action_plans  enable row level security;

drop policy if exists "owner rw truth" on public.truth_records;
create policy "owner rw truth" on public.truth_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner rw plans" on public.action_plans;
create policy "owner rw plans" on public.action_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
