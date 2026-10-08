# FOUNDER-QUEUE.md — device / eyes-on items only the founder can close

Acceptance is **observation, never attestation.** Some acceptance steps require a
real device or a human eye (iPhone screenshots, side-by-side visual diffs). The
agent ships the code, records the deploy id + external-fetch proof, and files the
observation step here. **No per-item pings** — the founder works this queue on
their own cadence.

Format: one checklist block per work order. Check the box when done; the WO is
not fully accepted until its boxes are checked.

---

## WO-AEO-MOBILE-HISTORY-001 — iPhone roadmap clip + Citation Sweep history parity

**Shipped to production:** Part A + Part B `main` @ `91cfa7e`
(`dpl_5gpagAKzCpyHrEnqfJGkiuQJWva2`); saved-sweep **fidelity parity** `main` @
`5f4b192` (`dpl_7795stas5W1zefaUDSkemYYmWN5S`). All live under the v1.1 GO /
freeze exception.

### ⛔ ONE MANUAL GATE before the fidelity part of QA — apply the migration
Fidelity in a saved sweep needs a new column. Run this once in the **Supabase SQL
editor** (safe: additive, nullable, no backfill, reversible). The code is fail-safe
without it — sweeps still save; they just won't carry a fidelity snapshot until it's run.

```sql
alter table public.citation_sweeps
  add column if not exists full_result jsonb;
```

Then **probe-verify** (migration guard): run one full sweep and confirm the new
`citation_sweeps` row has `full_result->'truth'` populated. (Sweeps run *before*
the migration won't have it — that's expected; run a fresh one.)

Code-side proof already recorded by the agent (tsc clean · 206 tests · build
clean · production deploy id + external fetch). What remains is **device
observation** — only the founder can take these:

### Part A — roadmap tab/download clip on iPhone
- [ ] iPhone Safari, `/analyzer` results → **Implementation Roadmap** card:
      screenshot showing all three tabs (SUMMARY · HANDOFF · PLATFORMS) reachable
      and **DOWNLOAD REPORT full-width below the tab row, visible and tappable**
      at ≤480px. No clipping, nothing lost off-screen.
- [ ] Same check on `/sweeps` results header on iPhone.
- [ ] Desktop 1280px: confirm no visual change vs. before (pixel-diff / eyeball).

### Part B — Citation Sweep history parity
- [ ] Open the **Dolphinpools.us 8/21/2026** sweep from `History → Citation
      Sweeps` via the new **View →** link. Side-by-side vs. the original run:
      scores, per-engine table, cited-instead, authority gap, transcripts match.
- [ ] **Download report** from the saved view produces the report (B2).
- [ ] Transcripts **Show details** expands from the saved view (B3).
- [ ] The History row's cost still reads **$0.45** — proves no re-run / $0 (B1).
- [ ] iPhone + desktop 1280px screenshots of the saved-sweep view.

### Fidelity parity (new — needs the migration above + a fresh sweep)
- [ ] After applying the migration, run a **new** full sweep, then open it from
      History → **View**. Confirm the **Fidelity / drift** section renders (and the
      per-run "drifted" badges), matching what the original run showed.
- [ ] **Download report** from that saved view includes the fidelity section too.

> Note: the saved view rebuilds from stored `citation_sweeps` + `sweep_results`.
> **Fidelity is now retained** via a compact point-in-time TruthRecord snapshot
> (`full_result.truth`) — no raw HTML stored. Intentionally still omitted from the
> saved record (low compare value / belong elsewhere): entity-linking, content-depth,
> truth-as-standalone, bot-stats. Nothing is fabricated or re-queried.
> Migration status: **`20260902_wo_mobile_history_full_result.sql` — apply + probe.**

## Next up (noted 2026-09-30, founder's request)

- [ ] **AEO GTM email wave — by hand from lindsay.d.hiebert@thesmartaiworker.com** (Instantly was cancelled 8 Oct per WO-AEO-SWEEP-RERUN-002). Inputs: the four sendable SaaS targets and their address verdicts in the private re-sweep report; the outreach copy doc; plan of record `docs/GTM90-STATUS-AND-PLAN-2026-08-05.md`. Sends ledger lives in `thesmartaiworker-site`. Nothing auto-sends; log each send's date.

## Done 2026-10-08 — WO-AEO-SWEEP-RERUN-002 revB

- [x] Eight re-sweeps on the approved configs, one date, four engines, three reps, $6.64 of $8.00, zero errored. Report (md + docx), findings CSV and address-verification CSV are in `private/baselines/rerun-2026-10-08/` and the founder's Downloads (`WO-AEO-SWEEP-RERUN-002-REPORT-2026-10-08.docx`). Nothing sent. Prospect data stays out of the repo.
- [ ] **Founder decisions from the report:** the sendable set is now four, not six (two targets win their category in October); three of the four addresses are unverified and need a route (open one page by hand; two go via the published support inbox or are dropped).

## 2026-10-08 — WO-AEO-PRODUCT-FIXES-003 (one change set, shipped)

- [x] **Migration `20261008_wo_product_fixes_003_scoring_version.sql` APPLIED 2026-10-08** (founder; verified by information_schema: three columns present). The eight October rows were stamped with their scoring version; older rows stamp themselves on first open. ~~Run migration~~ in the Supabase SQL editor (additive: `scoring_version`, `rescored_at`, `rescore_note` on `citation_sweeps`). Until it runs, every write falls back cleanly and History shows "older rules · re-scored on open" on every row; after it runs, opening a sweep stamps the row and the chip turns to "current rules".
- [ ] QA on production in one pass: History → any sweep → the Scoring column; open a sweep that has two dates on the same questions → the "Measured over time" card with the delta and a link per date; the tile under "Recommended to new buyers" reads "N=… scored answers = … questions × … engines × … runs = … category answers; … answered from memory (no search, not scored)"; the Word/Markdown/PDF carry the same two lines under the scorecard table.
- Report + filled verification checklist: `private/work-orders/WO-AEO-PRODUCT-FIXES-003/` and Downloads.
