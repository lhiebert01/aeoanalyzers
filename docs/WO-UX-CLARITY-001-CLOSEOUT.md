# WO-UX-CLARITY-001 — Close-out report

**Date:** 2026-08-01 · **Scope class:** maintenance/copy under the v1.8.0 freeze.
**Verification:** full suite **204 tests green** (was 190 + 14 new), `tsc --noEmit` clean,
`npm run build:nopre` green. Live-served verification after deploy.

## Item-by-item

| Item | Status | What shipped |
|---|---|---|
| **"Which tool, when?" explainer** | ✅ DONE | Shared `ScoreVsSweepCard` (`src/components/ScoreVsSweepCard.tsx`) rendered on the **Analyzer** page (App.tsx results) and **Sweeps** page (SweepDashboard). Copy centralized in `src/content/scoreVsSweep.ts`. One-line taglines under each destination (Sweeps h1 + Analyzer results). One FAQ entry (`PersonasAndFAQ.tsx`). Cross-links both directions: "Prove your fixes worked — run a Citation Sweep →" (Analyzer→Sweeps) and "Structural fixes live in your AEO Score →" (Sweeps→Analyzer). |
| **Sweep action block** | ✅ DONE | `buildSweepActionAgenda` (`src/lib/sweepActions.ts`) appended to **all three** sweep report surfaces: web (`AgendaBlock` in SweepDashboard results), `.md` (`buildReport`), and exec variant (`renderExecReport`). Maps each measured layer → action: retrievability weak → run the AEO Score; fidelity/collision → paste-ready remediation (`@id` graph + unaffiliation line, grounded, no fabricated values); category shortfall → losing questions as a content agenda + Do-now authority checklist; always closes with "Re-sweep after changes — same questions, same way." |
| **Input safety (a) all-zeros banner** | ✅ DONE | `isAllZeroAnalysis` + verbatim `ALL_ZERO_BANNER` (`src/lib/inputSafety.ts`); amber banner in the analyzer results. Catches the `analyzers.com` wrong-domain miss (confident 0/100 → "Verify the URL"). |
| **Input safety (b) did-you-mean near-miss** | ⏸️ **BACKLOG** (sized beyond small) | The fuzzy "did you mean {prior brand}?" check needs session domain history + fuzzy match + suggestion UI. Logged; the all-zeros banner covers the demonstrated failure. |

## Copy provenance (flag-back condition #1)
The verbatim explainer *card body* was not in my context — only the ratified **framing**
(Score = inside-out readiness you control; Sweep = outside-in engine outcome) and the two
verbatim cross-link strings. Card/tagline/FAQ prose was authored to that framing and
voice-linted (test: `scoreVsSweep.test.ts` runs `bannedAbsolutes` over every string).
The cross-link strings are asserted verbatim. **Exact deployed copy is in
`src/content/scoreVsSweep.ts`** — flag any word to change; it's reversible microcopy.

## New/changed files
- NEW `src/lib/sweepActions.ts`, `src/lib/inputSafety.ts`, `src/content/scoreVsSweep.ts`, `src/components/ScoreVsSweepCard.tsx`
- NEW tests: `sweepActions.test.ts` (6), `inputSafety.test.ts` (5), `scoreVsSweep.test.ts` (3)
- EDIT `src/components/SweepDashboard.tsx`, `src/App.tsx`, `src/lib/execReport.ts`, `src/components/PersonasAndFAQ.tsx`

## Test count: 204 pass (14 new). tsc clean. build green. No regressions.

## Backlog
- Input-safety near-miss "did you mean {prior brand}?" (session history + fuzzy match + UI).
- Panel v1.1: apply the A2c defunct-name lint to pinned Q8 ("SearchGPT" → "ChatGPT search")
  before the Sept 1 run (see the SERIES ANCHOR note).
