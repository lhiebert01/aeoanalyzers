-- WO-AEO-SWEEP-MEMORY-001 — persist per-run measurement flags so a SAVED sweep
-- re-derives the SAME scores as the live run.
--
-- The saved-view scorecard is already recomputed from stored runs, and the per-engine
-- table is now recomputed the same way (errored runs excluded, retroactively correcting
-- sweeps run before this fix). That recomputation needs two per-run flags that were not
-- persisted:
--   truncated : the answer was cut off by the token cap — unmeasured, excluded (WO-QA-003 A1)
--   grounding : 'search-grounded' | 'model-prior' | 'indeterminate' — model-prior category
--               runs are kept out of citation-win (WO-QA-003 A2)
-- (Errored runs are detected from the stored "[error: …]" transcript, so they need no column.)
--
-- Additive, forward-only, no backfill. Pre-fix rows leave these NULL; the aggregator
-- treats NULL truncated as false and NULL grounding as grounded (existing back-compat),
-- so old saved sweeps get the errored correction while newer ones are exact.
-- RLS unchanged (owner SELECT on sweep_results already covers reads).

alter table public.sweep_results
  add column if not exists truncated boolean,
  add column if not exists grounding text;

comment on column public.sweep_results.truncated is
  'WO-AEO-SWEEP-MEMORY-001: answer cut off by token cap — excluded from scores in the saved-view recompute.';
comment on column public.sweep_results.grounding is
  'WO-AEO-SWEEP-MEMORY-001: search-grounded | model-prior | indeterminate — for the saved-view recompute.';
