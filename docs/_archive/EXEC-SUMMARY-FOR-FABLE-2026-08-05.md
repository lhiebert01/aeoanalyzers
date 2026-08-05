# AEO Analyzers — Exec Summary (Claude Code → Claude Fable, FYI)

_2026-08-05. Handoff/status brief. Grounded rule: every number cites the dated stored
baseline; live figures live in dashboards, not the narrative._

## 1. What AEO Analyzers is (one line)
A measurement-honesty SaaS (aeoanalyzers.com) that tells a business whether AI answer
engines — ChatGPT, Claude, Perplexity, Gemini — actually **recommend it** when buyers ask,
with every score backed by a **stored, reproducible transcript**. React 19 + TS + Supabase +
Vercel + Gemini. Parent: PIGENAI LLC. Dedicated content/brand site: TheSmartAIWorker.com.
Current release **v1.8.0 (Jul 31 2026)** — **feature-frozen** under GTM-90 (bug fixes +
paying-customer blockers only). 204 deterministic-core tests, all builds clean.

## 2. What we built / enhanced (the last-two-weeks "super feature" set — now in production)
- **Citation Sweep measurement integrity (Lane A):** per-engine truncation exclusion (cut-off
  answers badged & dropped from denominators, not counted as fake 0%); **search-grounded vs
  model-prior** separation; **N + confidence printed on every metric cell.**
- **Fidelity (Lane B):** branded answers classified cited-accurate vs cited-drifted; **entity-
  linking collision detection** — names exactly which tickers/extensions/similar entities the
  engines confuse you with (the "invented co-founder" bug turned into a detector).
- **Recommendation quality (Lane C):** auto-detected competitors (named-in-text); **attainability
  tiers** (Now / Earn / Aspirational — no "get on Wikipedia" goose chases); ICP segmentation so an
  out-of-segment 0% reads correctly.
- **Research-anchored differentiators (Lane E):** PAWC (Position-Adjusted Word Count, Princeton
  GEO study); fact-density / info-gain auditor; llms.txt generator + spec validator + drift-diff.
- **Courtesy-sweep generator** (`scripts/exec-report.ts`): domain → review-ready executive report
  + DRAFT outreach email (CAN-SPAM footer, opt-out; **nothing auto-sends** — human review gate).
- **UX clarity (Aug 1):** Score-vs-Sweep explainer, per-sweep action agenda, all-zeros input-safety
  banner. **Config guardrails:** competitor sanitizer + defunct-name lint; Gemini output cap 900→2048.
- **N=5 baseline of record** + **SERIES ANCHOR (Aug 1):** branded retrievability **100%** (N=40),
  category citation win **0%** (N=200), 0 Gemini truncations. This is the **Sept 1 comparator**.

## 3. Why this is a significantly differentiated / advanced AEO capability
The entire GEO/AEO practitioner market (verified via r/GEO_optimization, r/aeo, r/Agentic_SEO)
is drowning in **single-run screenshot "measurement," one-blended-score vendor tools, and gray-hat
snake oil.** The community's smartest voices are begging for exactly what AEO Analyzers already does:
- **Reproducibility, not vibes.** Every score = a stored transcript; runs repeated (reps=5); reports a
  **rate, not a single draw**. (The top community post literally reads: *"a metric that changes every
  time you measure it isn't a metric, it's a mood."* That IS our thesis.)
- **Three separable layers, each with its own fix path:** retrievability (can the engine reach you) /
  fidelity (does it get you right) / citation win (does it recommend you over rivals). The community
  keeps rediscovering our exact distinctions: *cited ≠ recommended*, *being read ≠ being cited*.
- **Measurement integrity others lack:** truncation exclusion + search-grounded/model-prior split =
  no fake 0%s; N + confidence on every cell = no bare, misleading scores.
- **Names the collisions** (entity-confusion detector) and **tiers the homework** (attainability) so
  fixes are actually doable by a small team.
- **Refuses exploit-class features** (fake-entity seeding, parasite SEO, per-vendor cloaking, scare-
  binary scoring). We win on honesty — the one thing the market is starved for.

**Benefit by audience:**
- **B2B SaaS:** know whether AI names you on the buyer-intent questions where pipeline now routes;
  fix the specific failing layer; **prove the fix** on re-measure.
- **SEO/AEO agencies:** client-defensible reports (transcripts, denominators, confidence) that survive
  scrutiny — vs. the "trust the score" tools clients distrust; courtesy-sweep generator for prospecting.
- **End customers:** free ~90-second first look.

## 4. What we've launched / where we stand
**Honest-Zero Part 1 arc — LIVE + syndicated:** Blog (`/blog/i-scored-zero`, canonical), LinkedIn,
Bluesky, X, Medium, Substack. Also live: `/blog/what-you-actually-get`, `/blog/are-you-the-answer-ai-gives`,
`/blog/how-it-works` (6-diagram visual explainer).
**Narrative of record:** branded 98% / category 0% / 265 AI-crawler visits in the 30 days to Jul 31 —
all reproducible from stored transcripts.

## 5. POSSE blog posts still to announce
- **Part 2 — "The Engines Read My Site 265 Times. Reading Isn't Citing."** → **WRITTEN + BUILT this
  session** (`public/blog/reading-isnt-citing/`, OG card generated, blog-hub card added). **HELD for
  founder content-approval + production push.** This is the next go-live.
- **Part 3 — the entity-confusion / invented-co-founder chapter** → NOT yet written. Needs a decision:
  keep it "a co-founder with no affiliation" (recommended, defamation-safe) vs. naming.
- **Facebook** — launch-kit copy ready, not yet posted.
- **`/methodology` page** — review-gated; draft on request; do NOT publish unreviewed.

## 6. Outreach plan
- **GTM-90:** feature-frozen; founder time is on the outbound motion. Calendar: **Aug 16 outreach** event.
- **Serial-story engine:** the honest-failure "publish my zero monthly" arc IS the GTM. **Sept 1
  re-measure** (pinned panel **v1.1**, reps=5, 3-competitor seed) = the next episode — run via the agent
  (`scripts/headless-sweep.ts`), **never the UI**; publish whatever it says.
- **Courtesy-sweep prospecting:** exec-report generator produces draft reports/emails; **manual send only.**
- **Ownership split:** live distribution/identity ledger = `OUTREACH-IDENTITY-STATUS.md` in the
  **thesmartaiworker-site** repo (strategy/identity session, Lanes 2 & 5). This repo tracks product +
  on-site content only.

## 7. Reddit + platform status for the new features
**Framing:** the new features have NOT been announced as a "feature launch" post — the GTM is the
**story series** (the features are the payoff of "everything I fixed because of the zero"). That's
deliberate and on-brand.
- **Part 1 syndication:** done across 6 platforms. **Reddit:** only **r/Entrepreneurs** survived (**46K
  views**, shares out-running votes ~8:1). r/SaaS, r/SEO, r/bigseo posts were **auto-removed** — root
  cause confirmed = **low CQS / sub-specific karma gates** (e.g. r/indiehackers requires 10 comment
  karma before posting), NOT content quality.
- **Buyer-community motion (started 2026-08-04/05):** joined the 6 AEO/GEO buyer subs — **r/GEO_optimization
  (#1 fit), r/aeo, r/Agentic_SEO, r/SEO, r/seogrowth, r/AISEOforBeginners** (logged in
  `docs/launch/aeo-geo-community-targets.md`). **First real comment posted** in r/GEO_optimization
  (measurement-honesty, no pitch). **5-comment queue** staged in `docs/launch/reddit-comment-queue.md`.
- **Discipline:** comment-first, value-first, soft-disclosure, **no links until standing is earned** —
  because (a) low-CQS accounts get auto-removed if they link, and (b) not-pitching IS the brand edge in a
  community sick of vendor noise. The winning accounts all lead with data + disclose softly; the naked
  link-droppers get downvoted.
- **r/indiehackers journey post** ("publish my worst number monthly") is written and ready but **gated
  behind 10 comment karma** there; modmail sent; do not repost until the gate clears.

## 8. Immediate open items (for Fable / next session)
1. **Part 2 push** — content-approve `reading-isnt-citing`, then push to production (Vercel).
2. **Part 3** — get the "don't name the co-founder" decision, then write + build like Part 2.
3. **Reddit karma climb** — 2–3 genuine comments/day from the queue across r/GEO_optimization + r/aeo;
   clear r/indiehackers 10-karma gate, then post the journey piece.
4. **Facebook** post (kit ready).
5. **Sept 1 re-measure** — the standing monthly commitment; the next story beat.
