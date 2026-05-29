# Changelog

## [Unreleased] — Accuracy Improvement Pass (2026-05-29)

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
