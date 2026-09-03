-- WO-AEO-SWEEP-INTEGRITY-002 A1 — persist the entered config ON the sweep row so a saved
-- view / regenerated report reproduces the live run field-for-field.
--
-- The live path scored owned-citation (domainCited) and cited-instead/share against the
-- brand + the ENTERED competitor list. citation_sweeps stored none of that config, so the
-- rebuild auto-detected a different competitor set (share N=11 -> 61) and lost domainCited
-- (owned-citation 100% -> 0%). These columns let the rebuild re-score against the real config.
--
-- P1-B (per-(user,domain) config memory) reads this same write — no second store.
-- Additive, forward-only. Pre-fix rows leave these NULL; the rebuild falls back to
-- auto-detect for those (current behavior). RLS unchanged.

alter table public.citation_sweeps
  add column if not exists category         text,
  add column if not exists competitors      jsonb,   -- [{name, domain?}] exactly as entered
  add column if not exists branded_queries  text[],
  add column if not exists category_queries text[];

comment on column public.citation_sweeps.competitors is
  'WO-AEO-SWEEP-INTEGRITY-002: the competitor list AS ENTERED, so a saved view re-scores cited-instead/share against it instead of auto-detecting.';
