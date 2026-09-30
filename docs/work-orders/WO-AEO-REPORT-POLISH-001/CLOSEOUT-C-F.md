# WO-AEO-REPORT-POLISH-001 — close-out, Lanes C · F · D · E (2026-09-30)

Released to production on the founder's "complete everything and push to production"
(2026-09-30), ahead of the Nov 1 window the order allowed for.

| Item | Value |
|---|---|
| Commit (main) | `6363dbd` (branch `report-polish-oct`, fast-forwarded) |
| Production deployment | `dpl_78FrGxdhu5ByN1TZej3M7JyDn4Pt` |
| Bundle proof (external fetch) | `/assets/index-F6QPPktn.js` contains "Download PDF", "Executive summary", "Recommended (prominent)", "Answered from memory (no search)" |
| Tests | 569 → **581**; tsc clean; orphan check + fail-closed prerender check passed |
| Page 1 (Sweep, Nybsys 2026-09-30, from stored runs) | `page1-sweep-nybsys-2026-09-30.png` in this folder — one printed page |
| Page 1 (Score) | captured by the founder in QA step 12 (the stored analysis is only reachable through the signed-in app) |

## What shipped

- **C — Executive summary + formatting, both reports.** One cover component (`src/lib/reportCover.ts`)
  renders page 1 for the Sweep (`src/lib/sweepReport.ts`, now a pure function) and the Score
  (`src/lib/scoreCover.ts` into `docxGenerator.ts`): title block · three headline numbers, plain
  label first · bar block by cell shading (segments / four dimensions) · who got named instead ·
  "what this means" from a template keyed to the diagnosis pattern, stored numbers only · first
  three actions with their section. One markdown→docx renderer (`src/services/mdToDocx.ts`) with
  three directives (tiles, bars, page break) sets type for both documents. Sweep section order:
  what AI believes → where you win and lose → who got named instead → sources the engines trust
  → action plan → methodology → appendix, page breaks before each. Score: educational sections
  moved behind the actionable ones; major sections on a new page. Screens show the same cover.
- **F — Plain-English aliases** from one table (`ALIAS` in sweepReport.ts); "Pick Rate" never
  appears (tested).
- **D — Recommended (prominent) vs Mentioned** (`src/lib/pawcSplit.ts`): split on the existing E1
  share at a quarter of the position-weighted answer; segment table, cover note and branded
  line; footnote states the rule. No metric value changed. Nybsys: 0 / 0 on every segment.
- **E — Download PDF** (`src/services/sweepPdf.ts`, `src/lib/mdToHtml.ts`): browser print-to-PDF
  over a print-styled rendering of the same markdown. Route chosen because the project sits at
  the serverless function cap and the order preferred an existing dependency over a new one;
  no second template, so the numbers cannot differ from the docx. Filename via the document
  title: `citation-sweep-<domain>-<date>`.

## Deviations, stated
1. **Lane D's "prominent" threshold** is new copy on an unchanged metric: the E1 implementation
   has no threshold, so one was needed to split at all. It is a quarter of the position-weighted
   answer, printed in the footnote wherever the split appears.
2. **Lane E is client-side**, not server-side. The order's own fallback language covers this;
   the reason is the function cap and the single-source rule.
3. **Score screen order** is unchanged (only the cover was added); the docx order changed as
   specified.

## Also in this release (integrity, main)
- The plan no longer says "accuracy problem" without fidelity evidence (`classifyProblem` takes
  drift + collisions; "recommendation problem" when found everywhere and accurate).
- The Word report no longer carries "What to do about these results" twice.
- The Part 2 POSSE pack's Bluesky line restated 265 → 36 (the last stale copy).

## Housekeeping
- Competitor PDF: read once in the scratchpad for structure only, nothing copied, **deleted**.
- QA: `QA-PLAN-SPOT-CHECKS.md` (also in the founder's Downloads).
