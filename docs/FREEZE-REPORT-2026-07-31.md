# WO-AEO-SWEEP-QA-003 — Completion & Feature-Freeze Report (2026-07-31)

**Status: COMPLETE.** All lanes (A–E) plus the courtesy-sweep generator, the N=5
baseline, and the two blog pieces shipped. This is the **feature-freeze line** per
GTM-90 §0: after Lane E, no net-new differentiators for the 90-day window unless a
paying customer is blocked. Founder + Fable time now shifts from building to the
outbound motion.

Test suite grew **114 → 178**; every commit landed tsc-clean + prod-build-clean,
and every measurement fix and fidelity detector was **proven by breaking its guard**.

## What shipped

**Measurement integrity (Lane A) — was blocking all prospect sweeps**
- **A1** — per-engine output caps + truncation exclusion. Cut-off answers are
  badged "truncated — not scored" and dropped from every denominator; a column
  >20% truncated is flagged unreliable instead of shown as a fake 0%.
- **A2** — search-grounded vs model-prior classification. Answers where web search
  never fired are kept out of citation-win and reported as separate "model-prior
  visibility."
- **A3** — N + confidence on every metric cell; low-N claims hedged in the summary.

**Fidelity (Lane B)**
- **B1** — the WO-2 fidelity classifier runs on branded answers: cited-accurate vs
  cited-drifted; a "what AI gets wrong about you" list.
- **B2** — entity-linking failure detection from cited sources: Wikipedia acronym
  pages, stock-ticker collisions, near-name domains → "engines are confusing you
  with…" + the @id / unaffiliation remediation.

**Recommendation quality (Lane C)**
- **C1** — competitors auto-detected from the answers (named-in-text, not source
  listicles), mapped to display names; extraction proposes same-category rivals.
- **C2** — authority-gap sources tiered Now / Earn / Aspirational (versioned
  registry) — no more "get on Wikipedia" to a solo founder.
- **C3** — query-set ICP segmentation; an out-of-segment 0% (e.g. "best AEO for
  enterprise") reads as out-of-segment, and the report names the winnable segment.

**Research-anchored differentiators (Lane E) — the freeze set**
- **E1** — Position-Adjusted Word Count (PAWC): prominence-weighted answer share,
  per the Princeton GEO study.
- **E2** — fact-density / info-gain page auditor: statistics / quotations / inline
  citations / keyword-stuffing, each flag citing the study's effect size as an
  association, never a promise. Names the fact-density gap vs cited competitor pages.
- **E3** — llms.txt / llms-full.txt generator + spec validator + drift-diff vs the
  live-served file.

**Productization + proof**
- **Courtesy-sweep generator** (`scripts/exec-report.ts`): one command turns a
  prospect domain into a review-ready executive report + a DRAFT outreach email
  (draft-only, CAN-SPAM footer + opt-out; nothing auto-sends). Grounded rule
  enforced — numbers come from the sweep JSON, the model authors only prose, with a
  gray-hat blocklist backstop.
- **N=5 baseline** (`docs/baselines/aeoanalyzers-N5-2026-07-31.*`): 240 runs, the
  post-A/B/C1 baseline of record — 98% branded / 0% category (high confidence),
  fidelity clean, listicle pollution gone. Gates the honest-zero series + public claims.
- **Blog**: `/blog/what-you-actually-get` published; `/blog/are-you-the-answer-ai-gives`
  brought onto the measurement-honesty voice; a voice-lint test scans the published
  HTML so hype can't regress.

## Backlog — post-freeze unless a paying customer's report requires it

- Wire `factClassification.ts` four-way split (stale/conflated/fabricated) into
  sweep fidelity output — then blog Layer 2 may be upgraded to four-way language.
- A2 optional search-forcing retry for engines that return model-prior.
- ✅ DONE (POLISH-002 B6, Aug 1): Gemini output cap raised 900 → **2048** in
  `api/_lib/engines.ts` (Gemini 3.x spends output budget on reasoning first). Live
  validation = the reps=5 SERIES ANCHOR run (expect ~0 Gemini truncation flags).
- **A3 series-set versioning (POLISH-002 A3 — BACKLOGGED, sized beyond small):**
  saving a domain's question set as a versioned, reusable "monitoring set" and
  reading it back each month is a new Supabase entity (`monitoring_set` table) +
  read path in `analyze()`/`run()` + UI — none exists today (questions regenerate
  fresh every run). Until built, "same questions each month" is enforced *manually*
  via the pinned file `docs/baselines/aeoanalyzers-question-panel.md`. Build when
  the freeze lifts or a paying customer needs recurring monitoring.
- Owned-citation ~54% is the entity-collision remediation's to move (ship the
  @id/unaffiliation fixes on the site, then re-measure).
- Swap fictional "Meridian" for the ratified anonymized automaker sweep on the
  "we measure, not estimate" blog post (real numbers on that page).
- Deploy a refreshed `llms.txt` from the E3 generator (drift-diff showed +1 to add).

## Maintenance mode
Founder GTM-90 motion owns the calendar (see `OUTREACH-IDENTITY-STATUS.md` in the
thesmartaiworker-site repo). Product changes here are limited to bug fixes and
paying-customer blockers until the freeze lifts.
