-- WO-SUPABASE-GRANTS-001: explicit Data API grants backfill for Supabase project aeoanalyzers (djrmrbbwfvycjzxfntih).
--
-- From October 30, 2026, Supabase no longer grants API access (anon, authenticated, service_role)
-- to new tables, views, sequences and functions in public. Replaying this project's SQL onto a
-- fresh project, a branch or a local reset would then create objects the API cannot reach.
-- Applied after every other schema file, this file restores exactly the grants production held
-- on 2026-10-27: generated from production (helper Q4 for tables, views and sequences; Q5 for
-- function EXECUTE grants), never typed by hand, so it broadens nothing. Each statement runs only
-- if its object exists, so the file is idempotent and a no-op on production.
--
-- Tables with RLS still need their policies, which live in the files that create them.

-- Tables, views and sequences (Q4): 27 grants
do $g$ begin if to_regclass('public.action_plans') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.action_plans to anon'; end if; end $g$;
do $g$ begin if to_regclass('public.action_plans') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.action_plans to authenticated'; end if; end $g$;
do $g$ begin if to_regclass('public.action_plans') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.action_plans to service_role'; end if; end $g$;
do $g$ begin if to_regclass('public.analysis_history') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.analysis_history to anon'; end if; end $g$;
do $g$ begin if to_regclass('public.analysis_history') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.analysis_history to authenticated'; end if; end $g$;
do $g$ begin if to_regclass('public.analysis_history') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.analysis_history to service_role'; end if; end $g$;
do $g$ begin if to_regclass('public.bot_hits') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.bot_hits to anon'; end if; end $g$;
do $g$ begin if to_regclass('public.bot_hits') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.bot_hits to authenticated'; end if; end $g$;
do $g$ begin if to_regclass('public.bot_hits') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.bot_hits to service_role'; end if; end $g$;
do $g$ begin if to_regclass('public.bot_hits_id_seq') is not null then execute 'grant SELECT, UPDATE, USAGE on sequence public.bot_hits_id_seq to anon'; end if; end $g$;
do $g$ begin if to_regclass('public.bot_hits_id_seq') is not null then execute 'grant SELECT, UPDATE, USAGE on sequence public.bot_hits_id_seq to authenticated'; end if; end $g$;
do $g$ begin if to_regclass('public.bot_hits_id_seq') is not null then execute 'grant SELECT, UPDATE, USAGE on sequence public.bot_hits_id_seq to service_role'; end if; end $g$;
do $g$ begin if to_regclass('public.citation_sweeps') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.citation_sweeps to anon'; end if; end $g$;
do $g$ begin if to_regclass('public.citation_sweeps') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.citation_sweeps to authenticated'; end if; end $g$;
do $g$ begin if to_regclass('public.citation_sweeps') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.citation_sweeps to service_role'; end if; end $g$;
do $g$ begin if to_regclass('public.query_panels') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.query_panels to anon'; end if; end $g$;
do $g$ begin if to_regclass('public.query_panels') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.query_panels to authenticated'; end if; end $g$;
do $g$ begin if to_regclass('public.query_panels') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.query_panels to service_role'; end if; end $g$;
do $g$ begin if to_regclass('public.sweep_results') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sweep_results to anon'; end if; end $g$;
do $g$ begin if to_regclass('public.sweep_results') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sweep_results to authenticated'; end if; end $g$;
do $g$ begin if to_regclass('public.sweep_results') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sweep_results to service_role'; end if; end $g$;
do $g$ begin if to_regclass('public.truth_records') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.truth_records to anon'; end if; end $g$;
do $g$ begin if to_regclass('public.truth_records') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.truth_records to authenticated'; end if; end $g$;
do $g$ begin if to_regclass('public.truth_records') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.truth_records to service_role'; end if; end $g$;
do $g$ begin if to_regclass('public.users') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.users to anon'; end if; end $g$;
do $g$ begin if to_regclass('public.users') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.users to authenticated'; end if; end $g$;
do $g$ begin if to_regclass('public.users') is not null then execute 'grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.users to service_role'; end if; end $g$;

-- Function EXECUTE grants (Q5): 6 grants
do $g$ begin if to_regprocedure('public.handle_updated_at()') is not null then execute 'grant execute on function public.handle_updated_at() to anon'; end if; end $g$;
do $g$ begin if to_regprocedure('public.handle_updated_at()') is not null then execute 'grant execute on function public.handle_updated_at() to authenticated'; end if; end $g$;
do $g$ begin if to_regprocedure('public.handle_updated_at()') is not null then execute 'grant execute on function public.handle_updated_at() to service_role'; end if; end $g$;
do $g$ begin if to_regprocedure('public.is_admin(text)') is not null then execute 'grant execute on function public.is_admin(text) to anon'; end if; end $g$;
do $g$ begin if to_regprocedure('public.is_admin(text)') is not null then execute 'grant execute on function public.is_admin(text) to authenticated'; end if; end $g$;
do $g$ begin if to_regprocedure('public.is_admin(text)') is not null then execute 'grant execute on function public.is_admin(text) to service_role'; end if; end $g$;
