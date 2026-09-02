-- WO-AEO-MOBILE-HISTORY-001 (v1.1 follow-up) — saved-sweep fidelity parity.
--
-- A saved Citation Sweep already rebuilds scores, per-engine table, cited-instead,
-- source citations, transcripts, and the authority gap from citation_sweeps +
-- sweep_results. The one section it could not show was FIDELITY (drift) — because
-- fidelity is derived at run time from a LIVE fetch of the client's own site
-- (its point-in-time TruthRecord), which was never persisted.
--
-- This adds a compact, forward-only snapshot: citation_sweeps.full_result holds the
-- TruthRecord captured during the run ({ "truth": {...} }). The saved view then
-- RECOMPUTES the fidelity section, the per-run drift badges, and the downloaded
-- report's fidelity section deterministically from the stored runs + this snapshot.
-- No raw HTML is stored (small, not a page snapshot). No backfill: sweeps run
-- before this migration simply won't carry a truth snapshot, and the saved view
-- degrades gracefully to the pre-fidelity record (never fabricated, never re-fetched).
--
-- RLS: unchanged. Writes come from the server (service role, bypasses RLS); reads
-- are covered by the existing "owner reads sweeps" SELECT policy on citation_sweeps.
-- Migration guard: not "done" until probe-verified live (run a full sweep, then
-- confirm the row's full_result->'truth' is populated and the saved view shows the
-- fidelity section).

alter table public.citation_sweeps
  add column if not exists full_result jsonb;

comment on column public.citation_sweeps.full_result is
  'WO-AEO-MOBILE-HISTORY-001: point-in-time snapshot for saved-view parity — currently { truth: TruthRecord } captured at run time so a saved sweep can recompute its fidelity/drift sections. Forward-only; not backfilled. No raw HTML.';
