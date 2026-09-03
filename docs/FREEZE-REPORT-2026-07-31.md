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

- **v1.9 #1 (WO-INTEGRITY-002 B1a) — sweep DEPTH mode:** reps 3–5 on ≤6 questions, or a
  split sweep with a longer budget, so a small panel gets real N≥3. Today the maxDuration
  trimmer (`api/run-sweep.ts:294`) drops a 12-question panel to reps=1 (breadth over depth).
  The monthly self-sweep series stays headless at reps=5 regardless (`scripts/headless-sweep.ts`).
- **WO-INTEGRITY-002 B7 — History list re-derives on load:** re-score the History rows the
  same way the saved view does (errored excluded, branded false-positives corrected) so the
  list matches the opened view and the "re-scored on open" note becomes unnecessary.

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
  - **A3 category-native competitor inference — real-world instance (WO-AEO-SWEEP-MEMORY-001, Sep 2 2026):**
    `lanternpost.app` (a free single-sender e-card product) was auto-guessed into the
    **group-card / party-invitation** category with the matching competitor set and panel.
    Guessed → corrected, side by side:
    - Category: *"Interactive digital greeting cards"* → **"Free digital greeting cards (e-cards)"**
    - Competitors: *Paperless Post / Punchbowl / Kudoboard* → **Paperless Post / Jacquie Lawson / Hallmark eCards**
    - Questions: group/team/farewell/RSVP + party-invitation panel → **individual-sender intents** (no-subscription, send-by-text, song-in-card, no recipient email/tracking)
    Lesson: category inference latched on multi-recipient/"group" tokens; a free 1:1 sender was
    misfiled with the wrong buyer, competitors, and questions. Feeds both A3 inference and the
    P1-B config-memory case (a user who corrects this once must not redo it every month).
- Owned-citation ~54% is the entity-collision remediation's to move (ship the
  @id/unaffiliation fixes on the site, then re-measure).
- Swap fictional "Meridian" for the ratified anonymized automaker sweep on the
  "we measure, not estimate" blog post (real numbers on that page).
- Deploy a refreshed `llms.txt` from the E3 generator (drift-diff showed +1 to add).
- **Optimize /blog/how-it-works diagram PNGs (next change set, founder-requested Aug 1):**
  the six visuals total ~11.9 MB (V3 ~4 MB @ 2528×1686). Compress/resize (e.g. width-cap
  ~1600px + PNG optimization, or WebP with PNG fallback) to cut page weight; images already
  `loading="lazy"` with width/height set. No tooling in-repo yet (no sharp/imagemagick) —
  add one for the pass. Also pairs naturally with a future `/methodology` link.
- **Public `/methodology` page (review-gated content, ADDENDA Aug-1 #5):** principles-
  level "publish the science" (multi-run rationale, search-grounded vs model-memory
  separation, the three layers, confidence/N, transcript storage, Princeton anchor)
  while "protecting the engineering" (no prompts, thresholds, classifier internals,
  heuristics, fixtures). Definitional AEO/category content. Draft routes to founder for
  review; chat-Claude supplies the draft on request. Do NOT publish unreviewed.
- **"No bare N" customer-facing pass (ADDENDA Aug-1 #3, needs care):** the header no
  longer shows bare "N" (rephrased to "several times each"). Converting the remaining
  scorecard cells (`N=40 · high confidence`) is nuanced — that N is TOTAL runs, not
  reps ("asked 5 times per engine" describes reps), so a blind relabel would misstate
  the quantity. Do as a deliberate copy pass that distinguishes reps from N, keeping
  precise N in the evidence/technical area.

## Maintenance mode
Founder GTM-90 motion owns the calendar (see `OUTREACH-IDENTITY-STATUS.md` in the
thesmartaiworker-site repo). Product changes here are limited to bug fixes and
paying-customer blockers until the freeze lifts.
