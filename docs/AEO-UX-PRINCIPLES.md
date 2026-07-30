# AEO Analyzers — UX & Output Principles (build law)

_The north star for the relaunch. Every feature obeys these. When a choice adds
inputs, tokens, or raw output, it's probably wrong._

## 1. One required input: the domain
- The user enters **only** the domain (`company.com`, no https).
- The AI crawls the site and **infers + presents for confirmation**: brand name,
  primary category, primary customer, primary problem, primary use case, primary
  differentiator, closest competitor.
- Extra questions appear **only conditionally** (multiple unrelated products;
  ambiguous geography). Never as permanent fields.
- Never make the user understand "branded vs category query architecture."
  Label it in plain language: "Questions about you" / "Questions from prospective
  customers" / "Competitive questions."

## 2. Minimum questions, not maximum
- Default to the **8 canonical buyer questions** (brand discovery, brand accuracy,
  differentiation, category discovery, problem-first, use-case fit, differentiator
  ownership, brand-vs-competitor). Not 30–50.
- The AI generates natural paraphrases; the user confirms a small set.
- Keep the brand **out** of category/competitive queries (organic recommendation test).

## 3. Minimum tokens
- Engine answers stay concise (CONCISE_SYS is already enforced).
- Default runs are modest; **more runs = a paid "Deep" depth**, not the default.
- Every extra query/engine/run has a real API cost — show the **estimated cost
  before "Run,"** and meter by depth (Quick / Standard / Deep / Monitoring).

## 4. Plain-English results first — never a data dump
- Lead with a **short human summary** of what it means, e.g.:
  > "AI knows you when asked by name, but recommends you to new buyers only 34% of
  > the time. When it doesn't pick you, Profound wins (14×) and Scrunch (11×).
  > Your site is cited in 61% of the answers that mention you."
- Then the **5-score scorecard** (headline composite + always-visible sub-scores):
  Branded Retrievability · Brand Fidelity · Category Recommendation Win ·
  Owned Citation Rate · Competitive Share.
- **Collapse raw transcripts** behind "show details." They are evidence/receipts,
  not the headline. A first-time user must understand the result without reading a
  single transcript.

## 5. Grounded, never fabricated (lesson #5)
- Brand Fidelity checks engine claims against **verified facts from the user's own
  site** — facts we can't verify are skipped, never invented.
- No fabricated metrics, ratings, or research citations. Verify any external
  reference before it ships.

---
_Distilled from founder direction, 2026-07-30. If a spec conflicts with this,
this wins — flag the conflict._
