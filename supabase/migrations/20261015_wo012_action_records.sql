-- WO-AEO-REPORT-SOURCE-COVERAGE-012 G — the Record.
--
-- One row per action a customer marked done (from the plan) or added themselves, stored per
-- customer domain. The next sweep of that domain opens with "Measured after these actions."
-- (the done actions with their dates, then the figures previous → now). The Record states
-- timing only; it never claims an action caused a figure.
--
-- Pro and Business only (plus the two admin accounts). Day Pass and Free cannot write rows;
-- the app shows them "The Record is included on Pro and Business." Owner-only reads.
-- Additive, forward-only, no backfill.

create table if not exists public.action_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  domain      text not null,
  title       text not null check (char_length(title) between 1 and 500),
  owner_tag   text not null check (owner_tag in ('Site', 'Content', 'Outreach')),
  source      text not null default 'own' check (source in ('plan', 'own')),
  action_key  text,
  done_at     date not null default current_date,
  note        text check (note is null or char_length(note) <= 2000),
  link        text check (link is null or char_length(link) <= 2000),
  created_at  timestamptz not null default now()
);

create index if not exists action_records_user_domain_idx on public.action_records (user_id, domain, done_at);

alter table public.action_records enable row level security;

drop policy if exists "owner reads records" on public.action_records;
create policy "owner reads records" on public.action_records
  for select using (auth.uid() = user_id);

-- Writes: the owner, on Pro or Business (or an admin account).
drop policy if exists "paid owner writes records" on public.action_records;
create policy "paid owner writes records" on public.action_records
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and (
      exists (select 1 from public.users u where u.id = auth.uid() and lower(coalesce(u.subscription_status, '')) in ('pro', 'business'))
      or lower(coalesce(auth.jwt() ->> 'email', '')) in ('lindsay.hiebert@gmail.com', 'liindsay.hiebert@gmail.com')
    )
  );

comment on table public.action_records is
  'WO-012 G: the Record. Done and own actions per customer domain, dated. Timing only, never cause.';
