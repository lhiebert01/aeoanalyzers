-- WO-1 — Tested Citation Sweeps: data model.
-- Run this in the Supabase SQL editor (or `supabase db push`). Additive only.
--
-- query_panels   : a reusable set of buyer-intent + branded queries per client/domain
-- citation_sweeps : one sweep run (aggregate summary + cost)
-- sweep_results   : every engine × query × run, with the stored transcript (auditable)

create table if not exists public.query_panels (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,
  domain        text not null,
  brand         text,
  branded_queries  text[] not null default '{}',
  category_queries text[] not null default '{}',
  competitors   jsonb not null default '[]'::jsonb,  -- [{name, domain?}]
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.citation_sweeps (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid,
  panel_id       uuid references public.query_panels(id) on delete set null,
  domain         text not null,
  brand          text,
  summary        jsonb not null,          -- SweepSummary (per-engine aggregates + topCompetitors)
  total_cost_usd numeric(10,4) not null default 0,
  total_runs     integer not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists public.sweep_results (
  id                uuid primary key default gen_random_uuid(),
  sweep_id          uuid not null references public.citation_sweeps(id) on delete cascade,
  engine            text not null,        -- claude | openai | perplexity | gemini
  query             text not null,
  query_type        text not null,        -- branded | category
  run_index         integer not null,
  cited             boolean not null default false,
  cited_competitors text[] not null default '{}',
  sources           text[] not null default '{}',
  transcript        text,
  cost_usd          numeric(10,4) not null default 0,
  created_at        timestamptz not null default now()
);

-- Trend charts + drill-down query paths.
create index if not exists idx_citation_sweeps_domain_created on public.citation_sweeps (domain, created_at desc);
create index if not exists idx_citation_sweeps_user on public.citation_sweeps (user_id, created_at desc);
create index if not exists idx_sweep_results_sweep on public.sweep_results (sweep_id);
create index if not exists idx_query_panels_user on public.query_panels (user_id);

-- RLS: writes come from the server (service role, which bypasses RLS). Enable RLS
-- and add owner-read policies so the browser can read a user's own sweeps.
alter table public.query_panels    enable row level security;
alter table public.citation_sweeps enable row level security;
alter table public.sweep_results   enable row level security;

drop policy if exists "owner reads panels" on public.query_panels;
create policy "owner reads panels" on public.query_panels
  for select using (auth.uid() = user_id);

drop policy if exists "owner reads sweeps" on public.citation_sweeps;
create policy "owner reads sweeps" on public.citation_sweeps
  for select using (auth.uid() = user_id);

drop policy if exists "owner reads sweep results" on public.sweep_results;
create policy "owner reads sweep results" on public.sweep_results
  for select using (
    exists (
      select 1 from public.citation_sweeps s
      where s.id = sweep_results.sweep_id and s.user_id = auth.uid()
    )
  );
