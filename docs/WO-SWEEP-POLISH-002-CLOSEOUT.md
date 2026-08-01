# WO-SWEEP-POLISH-002 — Close-out report

**Date:** 2026-08-01 · **Scope class:** maintenance/accuracy under v1.8.0 freeze.
**Verification:** full suite **190 tests green** (was 178 baseline + 12 new), `tsc --noEmit`
clean, `npm run build:nopre` green. Live-served verification pending deploy (see E).

## Item-by-item status

| # | Item | Status | What shipped / why |
|---|------|--------|--------------------|
| A1 | Competitor guesser bypasses C1 | **DONE (small slice) + BACKLOG (full)** | Added `src/lib/sweepConfig.ts` `sanitizeCompetitors` (dedupe, drop own brand/domain, drop empty/defunct) wired into `SweepDashboard.analyze()`; strengthened `extractPrompt` with a cross-shop test + explicit off-category negative example. **Full "category-native inference" backlogged:** C1 `detectCompetitors` is grounded on post-run transcripts — none exist at config time — so true category-native suggestion needs a knowledge base or prior-run reuse (sized beyond small). |
| A2a | Natural buyer phrasing vs jargon | **DONE** | `queryPrompt`: ≤2 of 10 may use the category technical term; rest plain-language. |
| A2b | Agency/reseller-segment query | **DONE** | `queryPrompt`: one agency-framed question when the category has a services channel. |
| A2c | Defunct-name lint | **DONE** | `DEFUNCT_NAME_REGISTRY` + `lintDefunctNames` (SearchGPT→ChatGPT search, Bard→Gemini, Bing Chat→Copilot, SGE→AI Overviews) wired over generated queries; also in the prompt. |
| A2d | Winnability mix | **DONE** | `queryPrompt`: require ≥1 "affordable alternative to {leader}"; drop pure A-vs-B that structurally excludes the brand. |
| A3 | Series-set versioning | **BACKLOG (sized beyond small)** | No saved question-set entity exists (questions regenerate each run). New Supabase table + read path + UI = beyond small. Interim manual enforcement: `docs/baselines/aeoanalyzers-question-panel.md`. Logged in FREEZE-REPORT. |
| B4 | Segment-note stale copy | **DONE** | `segmentSummaryNote` + `largestLosingSegment` in `querySegment.ts`; replaced the canned "enterprise-framed" line at all 3 call sites (`execReport.ts`, `SweepDashboard.tsx` ×2). Note now names the largest-N *rendered* losing segment. |
| B5 | Entity fixtures (3 new) | **DONE** | Locked `aeoanalytics.com`, `aeo-analytic.com` (new, hyphenated), `es.benzinga.com/quote/AEO` in `entityLinking.test.ts`. Detector already generalizes; this is the regression lock. |
| B6 | Gemini output cap | **DONE (code) · live-validate via C7** | `MAX_OUT.gemini` 900 → **2048** in `api/_lib/engines.ts`. A1 truncation exclusion stays as the net. |
| C7 | reps=5 SERIES ANCHOR run | **PENDING — founder action** | Paid live run (~$2.70); must run AFTER deploy so it validates B6. Use the pinned 12-question panel VERBATIM at reps=5; store labeled "SERIES ANCHOR — Aug 1 2026". |
| C8 | STRATEGY-CONTEXT update | **DONE** | Added the honest-zero series section (pinned set, N=5, monthly on the 1st, anchor = reps=5 run, narrative-numbers convention unchanged). |
| D9 | Homepage stat-enrichment draft | **DONE (draft only, not published)** | `docs/drafts/homepage-stat-enrichment-DRAFT.md` — measured/structural facts only, voice-lint applies, review-gated. |

## New/changed files
- NEW `src/lib/sweepConfig.ts`, `src/__tests__/sweepConfig.test.ts` (6 tests)
- NEW `docs/baselines/aeoanalyzers-question-panel.md`, `docs/drafts/homepage-stat-enrichment-DRAFT.md`
- EDIT `src/lib/querySegment.ts` (+`largestLosingSegment`,`segmentSummaryNote`), `src/__tests__/querySegment.test.ts` (+4)
- EDIT `src/__tests__/entityLinking.test.ts` (+1), `api/_lib/engines.ts` (Gemini cap)
- EDIT `src/lib/execReport.ts`, `src/components/SweepDashboard.tsx` (segment note + guardrail wiring + prompts)
- EDIT `docs/FREEZE-REPORT-2026-07-31.md`, `docs/STRATEGY-CONTEXT.md`

## Test count: 190 pass (12 new). Regressions: none (verified-working list intact).

## E — verification bar
- ✅ Regression test with every code fix (A1/A2c: sweepConfig.test; B4: querySegment.test; B5: entityLinking.test). A2a/b/d and B6 are prompt/config values validated at runtime (B6 → the C7 anchor run's Gemini truncation count).
- ✅ Full suite green, typecheck clean, build green.
- ✅ A2 model-prior exclusion unchanged (querySegment `segmentBreakdown` still drops model-prior + truncated — covered by existing tests, still green).
- ⏳ Live-served verification pending deploy.

## Remaining founder actions
1. **Authorize deploy** (commit + push → Vercel) so B6 + the report-copy fixes go live.
2. **Run the reps=5 SERIES ANCHOR** on aeoanalyzers.com with the pinned panel; confirm Gemini truncations ≈ 0 and fidelity holds at N=5. This is the last artifact before Sept 1.
3. Review the D9 homepage draft; nothing publishes without your word.
