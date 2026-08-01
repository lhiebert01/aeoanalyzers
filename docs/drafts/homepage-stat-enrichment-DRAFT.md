# Homepage / sweep-page stat-enrichment — DRAFT for founder review

**STATUS: DRAFT — FOUNDER REVIEW ONLY — DO NOT PUBLISH.** (POLISH-002 D9.)
Our own sweep flagged the homepage under E2 (9 verifiable statistics in 1094 words;
Princeton GEO arXiv:2311.09735 associates added statistics with a ~41% citation-
visibility lift — a *finding, not a guarantee*). This draft raises factual density
using ONLY numbers we ship and measure. No projections, no ratings, no superlatives.
Every figure below is either a structural fact of the product or a measured, stored
quantity. Voice-lint applies — reject any edit that reintroduces "best/only/guaranteed."

## Rule for whoever finalizes this
Each stat must be one of: (a) a structural fact (engine count, tier count, question-
set size), or (b) a value the product measures and stores per run (N, confidence,
transcript count, crawler tiers, cost). Do NOT hard-code a *measured* value that
drifts (e.g. "265 crawls") into evergreen homepage copy — those belong to a dated
report, not the marquee. Prefer the structural framing.

## Candidate stat-dense rewrites (adjective → measured fact)

**Hero subhead**
- Current (vague): "We measure how citable your site is across the major AI engines — and hand you the fixes."
- Draft (specific): "We test your site across **four** answer engines — ChatGPT, Claude, Perplexity, and Gemini — ask each **N times per question**, and report **three separable layers** (branded retrievability, category citation win, and who gets cited instead), every score backed by a stored transcript."

**How it works / trust strip** (new stat-dense bullets, all structural/measured)
- "**Four** engines, queried live with web search on — not a single-model guess."
- "Every score ships with its **sample size (N)** and a **confidence level** next to it."
- "Answers are separated into **search-grounded** vs **model-memory** and scored apart, so a no-search answer never inflates your number."
- "Crawler telemetry is split **three** ways — **live** (a person's question fetched your page now), **search** (indexing for the AI search layer), and **training** — so you can see which kind of bot read you."
- "First analysis in about **90 seconds**."
- "Every answer is stored as a **reproducible transcript** — re-run any query and you get what the report says."
- "Content-depth findings are cited to the **Princeton GEO study (arXiv:2311.09735)** and labeled as findings, not guarantees."

**Methodology one-liner** (footer or /why-aeo)
- Draft: "A standard sweep spans **12** buyer questions × **4** engines, each asked **N** times, with truncated and model-memory answers excluded from the scored metrics and flagged — reported with per-engine N, confidence, and run cost."

## Explicitly NOT included (would violate our own grounding rule)
- No aggregate rating / review count (we ship none we can substantiate — lesson #5).
- No "X% of customers…", no win/lift promises, no projected outcomes.
- No evergreen use of a drifting measured value (crawl counts, a specific 0%/98%);
  those stay in dated reports and the blog, not the marquee.

## Where these would go (for the finalizer)
`src/components/MarketingLanding.tsx` hero subhead + a "How it works" trust strip;
the methodology one-liner on `/why-aeo` (`PersonasAndFAQ.tsx`) or the footer. Keep
each claim to a structural or measured fact; run `voiceLint` over the final copy.
