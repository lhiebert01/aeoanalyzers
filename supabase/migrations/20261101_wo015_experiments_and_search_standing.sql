-- WO-AEO-FIX-IT-PLAYBOOK-015.
--
-- 1. The experiment log on the Record. Any action can carry a hypothesis ("this should move <metric>
--    from <value>"), the metric, a machine key so the report can read the metric's current value,
--    the value when the action was logged, and one or more check dates. On or after a check date the
--    report shows the metric then and now beside the action. Timing only, never cause.
-- 2. Lane 0: where the customer stands in the searches the engines run. The customer uploads their
--    Search Console (or Bing Webmaster Tools) export; it is parsed in the browser and ONLY the derived
--    table is stored here. The uploaded file itself is never sent or kept.
-- Additive, forward-only, no backfill.

alter table public.action_records
  add column if not exists hypothesis  text check (hypothesis  is null or char_length(hypothesis)  <= 1000),
  add column if not exists metric      text check (metric      is null or char_length(metric)      <= 300),
  add column if not exists metric_key  text check (metric_key  is null or char_length(metric_key)  <= 300),
  add column if not exists baseline    text check (baseline    is null or char_length(baseline)    <= 300),
  add column if not exists check_dates date[];

comment on column public.action_records.metric_key is
  'WO-015: what the report reads for "now": found_by_name | recommended | coverage_named | d1_recommended | gsc_position:<query> | cited_url:<url>.';

create table if not exists public.search_standing (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  domain       text not null check (char_length(domain) between 1 and 255),
  source       text not null check (source in ('google', 'bing')),
  period_label text check (period_label is null or char_length(period_label) <= 80),
  period_end   date,
  derived      jsonb not null,
  created_at   timestamptz not null default now()
);

create index if not exists search_standing_user_domain_idx on public.search_standing (user_id, domain, source, created_at desc);

alter table public.search_standing enable row level security;

drop policy if exists "owner reads search standing" on public.search_standing;
create policy "owner reads search standing" on public.search_standing
  for select using (auth.uid() = user_id);

-- Writes: the owner on Pro, Business or an active Day Pass (or an admin account). Never another user.
drop policy if exists "paid owner writes search standing" on public.search_standing;
create policy "paid owner writes search standing" on public.search_standing
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and (
      exists (select 1 from public.users u where u.id = auth.uid() and (
        lower(coalesce(u.subscription_status, '')) in ('pro', 'business')
        or (u.report_pass_until is not null and u.report_pass_until > now())))
      or lower(coalesce(auth.jwt() ->> 'email', '')) in ('lindsay.hiebert@gmail.com', 'liindsay.hiebert@gmail.com')
    )
  );

comment on table public.search_standing is
  'WO-015 Lane 0: the derived Search Console / Bing table per customer domain. The uploaded export is not stored.';

-- Explicit API grants (required from Oct 30, 2026): the signed-in owner through RLS above, and the service role.
revoke all on public.search_standing from anon;
grant select, insert, update, delete on public.search_standing to authenticated;
grant select, insert, update, delete on public.search_standing to service_role;
