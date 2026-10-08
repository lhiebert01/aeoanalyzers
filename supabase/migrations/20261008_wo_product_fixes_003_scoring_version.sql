-- WO-AEO-PRODUCT-FIXES-003 §4.2 — a stored figure and an opened figure are the same number,
-- or the row says why they differ.
--
-- scoring_version: the scoring rules the stored summary was computed under (written at run
-- time by api/run-sweep and by scripts/import-stored-sweeps). When the saved view re-scores a
-- row under newer rules and a pooled figure moves, it writes the new summary back with the new
-- version, the time, and a note stating old → new and the reason. History shows the version.
-- Additive, nullable, no backfill: a NULL version reads as "unversioned rules" and re-scores on
-- open like before. The owner UPDATE policy (20260930) already allows the write-back.

alter table public.citation_sweeps
  add column if not exists scoring_version text,
  add column if not exists rescored_at timestamptz,
  add column if not exists rescore_note text;

comment on column public.citation_sweeps.scoring_version is 'WO-AEO-PRODUCT-FIXES-003: scoring rules the stored summary was computed under (lib/sweepDisclosure SCORING_VERSION).';
comment on column public.citation_sweeps.rescore_note is 'WO-AEO-PRODUCT-FIXES-003: when a re-score on open moved a pooled figure, old → new and why.';
