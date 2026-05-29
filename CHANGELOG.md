# Changelog

## Hotfixes — DOCX download + resilient AI parsing (2026-05-29)

Two production issues surfaced after the accuracy release.

### Fixed: Word report download failed silently

- **Cause:** stale-chunk-after-deploy. `vercel.json`'s catch-all rewrite
  (`/(.*) → /index.html`) also caught missing `/assets/*.js`, so a browser
  running a previous build that lazy-loaded a now-deleted chunk (the code-split
  DOCX generator) received `index.html` (text/html) instead of a 404 — a MIME
  error that aborted the dynamic import. The DOCX code itself was fine (verified
  end-to-end in Node).
- **Fixes:**
  - `vercel.json` rewrite now excludes `/assets/` (`/((?!assets/).*)`), so
    missing chunks 404 cleanly instead of returning HTML.
  - `main.tsx` listens for Vite's `vite:preloadError` and reloads once
    (time-guarded against loops) so a stale tab auto-recovers after any deploy.
  - The download handler detects a chunk-load failure, reloads once, and
    otherwise shows a clear message instead of failing silently.

### Fixed: "Expected double-quoted property name in JSON" on analysis

- **Cause:** the model fallback chain started with `gemini-3-flash-preview` (now
  **deprecated** → 503) and `gemini-3.1-flash-lite-preview` (**wrong ID** — the
  stable model has no `-preview` suffix → 503), so every run fell through to
  `gemini-2.5-flash`, whose response occasionally contained a trailing comma or
  wrapping prose/markdown that crashed `JSON.parse`.
- **Fixes:**
  - Updated the model chain to current stable IDs (verified against
    ai.google.dev/gemini-api/docs/models, 2026-05-29):
    `gemini-3.5-flash` → `gemini-3.1-flash-lite` → `gemini-2.5-flash` →
    `gemini-2.5-flash-lite`.
  - Added `safeJsonParse` (strips fences, extracts the outermost JSON value,
    removes trailing commas) at every model-output parse site.
  - Raised `maxOutputTokens` 8192 → 32768 (3.5 Flash supports 65k; default
    "medium" thinking also draws from this budget) so large reports aren't
    truncated mid-JSON.

---

## Scoring Isolation — Option C (2026-05-29)

Follow-up to the accuracy pass. The brand/recommendation guidance was sitting in
the same Gemini call that computes the headline score, so the number could drift
purely from advice framing (we saw 88 → 84–86). This separates measurement from
advice while keeping scoring brand-aware *on purpose*.

### Changed

- **Scoring isolated from recommendation framing** (`geminiService.ts`). The core
  prompt now carries an explicit `SCORING DISCIPLINE` block stating that the
  site-type notes guide recommendations/diagnostics only and must not move the
  numeric `score`/`scoreBreakdown`.
- **Deliberate, principled density calibration.** The one place brand register
  legitimately belongs in scoring: editorial/news sites are no longer penalized
  on the density sub-score for an absence of hard statistics when the prose is
  calibrated and citable (the brief's Part 1 calls "0 stats" a *correct*
  diagnostic for Macro Lens). Non-editorial sites keep the original
  substance-based density definition.

### Result (live re-audit, getmacrolens.com)

- Score **89/100** (was 84–86 after the accuracy pass; 88 originally).
- Breakdown `entity 95 / density 85 / clarity 90 / structure 85` — density rose
  70 → 85 because calibrated editorial prose is no longer under-counted.
- All five accuracy fixes still verified: 0 voice rewrites, pricing question →
  `schema_only`, OfferCatalog ≤ 4, no inferred values in the verified block,
  no non-capability questions.

---

## Accuracy Improvement Pass (2026-05-29)

Implements Part 3 (Changes 1–6) of `AEOANALYZERS_IMPROVEMENT_BRIEF.md`, derived
from a real audit of getmacrolens.com. The goal: the tool no longer makes the
kind of basic errors a sophisticated brand owner would instantly catch.

The architecture here is Gemini-prompt-driven, so each fix has two layers:
the **prompt** asks for the right behavior, and a **deterministic guard**
(`applyAccuracyGuards` in `geminiService.ts`) enforces it in code regardless of
what the model returns. The guard is what the regression suite pins down.

### Added

- **Change 1 — Brand-type classifier** (`src/lib/brandType.ts`). Pure heuristic
  that classifies a site as `editorial` / `news` / `saas` / `ecommerce` /
  `service_business` from its HTML, and returns the voice rules for that
  register. Runs before any recommendation is generated. The detected type is
  surfaced in the UI and report.
- **Change 2 — Provenance-tagged schema** (`AnalysisResult.verifiedSchema`,
  `candidateSchema`, `schemaProvenance`). JSON-LD is now split into a
  **"Verified — safe to paste"** block (detected values only) and a
  **"Candidate — verify before pasting"** block (inferred values, flagged).
  Inferred values (e.g. a hallucinated regime label) can never reach the
  paste-into-`<head>` target. Source quotes back detected fields.
- **Change 3 — OfferCatalog filter** (`src/lib/offerCatalog.ts`). Strips internal
  architecture terms (`…Layer`, `…Engine`, `…Framework`, `…Model`, `…Pipeline`,
  `…System`, etc.) from the OfferCatalog and caps it at 4 user-facing services.
  Removed entries are disclosed to the user.
- **Change 4 — `SCHEMA_MISSING` gap category** (`src/lib/queryGap.ts`). The
  query-gap classifier now distinguishes "answer absent from the site"
  (`missing`) from "answer present in prose but not in FAQ schema"
  (`schema_only`). `schema_only` recommends *wrapping existing content in
  FAQPage schema* — not creating duplicate content.
- **Change 5 — Capability-scoped queries** (`src/lib/queryGap.ts`). Two-pass
  query generation: candidate questions are kept only if they reference a
  detected capability or are universally useful (pricing, founder, contact,
  compliance, etc.). Questions about features the site doesn't offer (mobile
  app, international markets) are dropped instead of generating content-bloat.
- **Change 6 — Voice gate for editorial brands.** For `editorial`/`news` sites,
  the "Adjective-to-Metric" rewriter is suppressed entirely and replaced with
  **Schema-Density Opportunities** (structured-data suggestions that raise AEO
  without touching prose).
- **Regression suite** (`src/__tests__/accuracy.test.ts`, `vitest`). 15 tests
  covering the five Part-4 cases, run with `npm test`.

### Changed

- `comprehensiveSchema` (the existing "paste this" field consumed by the web UI,
  handoff template, and DOCX report) now points at the verified, offer-filtered
  block, so every downstream surface is safe by construction.
- Query-gap recommendation copy in `AdvancedAnalysisCards.tsx`,
  `ImplementationRoadmap.tsx`, and `docxGenerator.ts` is now driven by
  `gapCategory`; `schema_only` items show the on-page source quote.

### Notes / deferred

- Part 5 (confidence intervals on the score, per-field source-quote UI,
  rewrite cost estimates, meta-validation self-audit) and Part 7 (LLM-graded
  pipeline, feedback loop, versioned templates) are not in this pass.
- Back-compat: all new `AnalysisResult` fields are optional; old history records
  render unchanged via legacy `answerQuality` → `gapCategory` bridging.
