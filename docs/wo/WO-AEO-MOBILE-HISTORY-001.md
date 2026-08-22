# WO-AEO-MOBILE-HISTORY-001 — iPhone roadmap clipping + Citation Sweep history parity

**Filed:** Aug 22, 2026 (founder, from real device + admin History view)
**Priority:** Part A = bug, ship now (freeze-compliant). Part B = hold on branch until founder go-word.
**Branch:** `fix/mobile-history-aug22` off `main`. Part A merges to `main` on device proof. Part B stays on the branch behind a Vercel preview until the founder says go.
**Scope:** `/analyzer` results (Implementation Roadmap card), any other horizontal tab/button rows; `/history` Citation Sweeps tab; `/sweeps` saved-view rendering.

---

## Part A — BUG: roadmap tab bar clips on iPhone (ship now)

### Observed
iPhone Safari, `/analyzer` results, **Implementation Roadmap** card. The tab row `SUMMARY · HANDOFF · PLATFORMS` and the `DOWNLOAD REPORT` button overflow the viewport. No horizontal scroll. Download is unreachable on mobile; it is only possible from desktop. Screenshot attached by founder.

### Required
- A1. At ≤480px the tab row either scrolls horizontally with a visible affordance, or wraps. Founder has no preference; pick the one that reads cleanest.
- A2. `DOWNLOAD REPORT` renders full-width **below** the tab row at ≤480px. It is never inside the overflow.
- A3. Audit every other horizontal button/tab row in the app for the same pattern (score-formula cards, History filters, sweep results header, pricing cards) and fix any that clip at 375px width.

### Acceptance (observation, never attestation)
- Real iPhone screenshots: roadmap card with all three tabs reachable and `DOWNLOAD REPORT` visible and tappable; same check on `/sweeps` results.
- Desktop 1280px pixel-diff: no visual change.
- Tests + lint green. Deploy id + commit hash. External-fetch proof.

---

## Part B — Citation Sweep history parity (hold on branch until go-word)

### Observed
`History → Citation Sweeps` rows show domain / branded / category / cost / date only. There is no **View** link. `History → Analyses` rows open the full saved AEO Score report; sweep rows do not. Sweep results (scores, per-engine table, cited-instead, authority gap, content agenda, transcripts) are stored but unreachable after the session ends. The only way back to the detail is to re-run the sweep, which costs money and is a different point in time. The sweep results page says *"Evidence — every answer, stored. 48 transcripts back the scores above"* — a returning user cannot currently see them.

### Required
- B1. Each sweep row gets **View →** `/sweeps?saved=<id>`, rendering the identical results page from stored data. No re-run, no engine calls, $0. Show a *"Viewing Saved Sweep · {date}"* banner with **Back to History**, same pattern as saved Analyses.
- B2. **Download report** works from the saved view and regenerates the same report from stored data.
- B3. Transcripts **Show details** works from the saved view.
- B4. If any result section cannot be rebuilt from stored data, state **which field is missing** in the close-out report. Do not fabricate, do not re-query. An additive migration is allowed only if a field is genuinely not persisted; probe-verify it live per the migration guard.
- B5. No UI beyond the View link, the banner, and Back to History. No new tables unless B4 forces it.

### Acceptance (observation, never attestation)
- Open the **Dolphinpools.us 8/21/2026** sweep from History. Every section matches the original run — side-by-side screenshots.
- Download from the saved view produces the report.
- The History row's cost stays **$0.45** (proves no re-run).
- Desktop 1280px + iPhone screenshots. Tests green. Deploy id + migration status line (`NONE` or probe result).

---

## Standing rules that apply
- Acceptance = observation, never attestation (real-device screenshots, external fetch, probe).
- Migration guard: a WO isn't done until any migration is probe-verified live.
- Truth rule: no copy claims a feature before its deploy id is recorded.
- Part A device screenshots go to `FOUNDER-QUEUE.md`; no per-item pings.
- Report Part A in the 18:00 CT digest. Send the Part B preview URL when it's ready and then wait.

## Out of scope
- Scheduled re-measures / email digests (K1, post-freeze).
- Monitoring-set versioning (A3 backlog).
- Any change to sweep pricing, question generation, or engine calls.
