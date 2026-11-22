-- Founder ruling (Nov 21, 2026; Nov 2 grants report, decision 4): usage counting moves to the server.
--
-- users.usage_count was incremented by the browser (src/App.tsx), so a signed-in user could write
-- any value and reset their own free-analysis limit. From now on:
--   - only the server increments it, through increment_usage_count() (service role only), called by
--     api/llm-generate.ts after each site analysis it generates;
--   - api/llm-generate.ts enforces the free limit on it before generating;
--   - the browser can read it (existing SELECT, own row) and cannot write it: signed-in users keep
--     no UPDATE privilege on users at all (last_analysis_at is set by the same function).
--
-- Same class, sweeps: citation_sweeps.created_at and total_cost_usd decide a plan's sweep
-- allowance (api/run-sweep.ts), and signed-in users could update every column of their own
-- sweeps. The browser writes only owned_domains and the re-scoring fields, so UPDATE is limited to
-- those columns.
--
-- No rows are read, changed or deleted by this migration.

create or replace function public.increment_usage_count(p_user uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.users
     set usage_count = coalesce(usage_count, 0) + 1,
         last_analysis_at = now()
   where id = p_user
  returning usage_count;
$$;

revoke execute on function public.increment_usage_count(uuid) from public, anon, authenticated;
grant execute on function public.increment_usage_count(uuid) to service_role;

-- Revoking the table-level privilege also removes the column-level UPDATE grants of
-- 20261102130000_users_column_writes.sql (usage_count, last_analysis_at).
revoke update on table public.users from authenticated;

revoke update on table public.citation_sweeps from authenticated;
grant update (owned_domains, summary, scoring_version, rescored_at, rescore_note) on table public.citation_sweeps to authenticated;
