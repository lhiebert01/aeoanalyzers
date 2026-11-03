-- Founder ruling on WO-015 (Nov 2, 2026): revoke TRUNCATE and every other unneeded table privilege
-- from the API roles. Row-level security never applies to TRUNCATE, so a role holding it could empty
-- a table outright; REFERENCES, TRIGGER and MAINTAIN are never needed by the app either.
--
-- Least privilege, from the app's own calls (src/ and api/, checked 2026-11-02):
--   anon           nothing on any table. Every policy requires the signed-in owner (auth.uid()), and
--                  every server write uses the service role.
--   authenticated  only what the browser does, still inside row-level security:
--                    users             select, insert, update   (profile; admins read the list)
--                    analysis_history  select, insert           (AEO Score history)
--                    citation_sweeps   select, update           (saved sweeps; rescoring write-back)
--                    sweep_results     select                   (stored answers)
--                    action_records    select, insert           (the Record)
--                    search_standing   select, insert           (Lane 0, WO-015)
--                  action_plans, truth_records, query_panels, bot_hits and gsc_connections are server
--                  only (service role).
--   service_role   unchanged (it bypasses row-level security by design).
-- This file sorts after *_explicit_api_grants_backfill.sql, so a replay ends in this state.

do $r$
declare t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p') loop
    execute format('revoke all on table public.%I from anon, authenticated', t.relname);
  end loop;
end $r$;

-- Sequences: the API roles never call nextval (inserts go through the table's default).
do $s$
declare t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'S' loop
    execute format('revoke all on sequence public.%I from anon, authenticated', t.relname);
  end loop;
end $s$;

grant select, insert, update on table public.users            to authenticated;
grant select, insert         on table public.analysis_history to authenticated;
grant select, update         on table public.citation_sweeps  to authenticated;
grant select                 on table public.sweep_results    to authenticated;
grant select, insert         on table public.action_records   to authenticated;
grant select, insert         on table public.search_standing  to authenticated;

-- New objects created by the migration role start with no API access at all.
alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
