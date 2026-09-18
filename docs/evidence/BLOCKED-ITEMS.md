# Blocked and deferred items — the file we actually re-read

**Why this file exists.** `/best-aeo-tools` (D1) was designated a keystone in August 2026
and sat unbuilt for two months. Its only trace was a comment in `SEO.tsx`. A deferred item
that lives in a code comment, or in a session's head, is not tracked — it is forgotten with
extra steps. Anything deliberately not built goes here, with its successor named.

Founder instruction, Sep 19 2026: *"a deferred item that lives only in your head or in a
code comment is how D1 was designated a keystone in August and sat unbuilt for two months."*

| Item | Why it was deferred | Successor | Logged |
|---|---|---|---|
| **`shellRoute` detector** — the customer-facing "does this URL serve its own document, or the shell?" check | It would have had no caller. The build-side gate (`scripts/check-prerender.mjs`) answers the same question from ground truth — did we render it? — so the two do not share code. Shipping a module nothing imports is precisely what `scripts/check-no-orphan-modules.mjs` exists to fail. | **WO-003/B**, which wires it into the customer scan. Its implementation reference is `scripts/check-prerender.mjs` and the marker lessons in `scripts/prerender.mjs`. | 2026-09-19 |
| **`/best-aeo-tools` (D1) — CORRECTED** | It is **built and live** (HTTP 200, 19,430 bytes, 15 competitor mentions, 5 date stamps, clean on the truth pass). The guardrail says "never built" and my own first row here repeated it. What is actually missing: it is **absent from sitemap.xml**, so nothing declares it. | A sitemap entry. Founder date. | 2026-09-19 |
| **FAQ verbatim-parity check** | Judged marginal against the first-200-characters check. Founder agreed. | **WO-003/B**, if it earns a slot. | 2026-09-19 |

## Rules

- An item leaves this table only when it ships or when the founder retires it in writing.
- "Blocked on a go-word" is not a valid reason. Per the Sep 5 standing rule, parked work is
  a **dated row** or a yes/no question with a stated default.

---

## Queued behind revenue — logged 2026-09-19 per the founder's standing ruling

GTM is no longer queued behind product work. Everything below is real and none of it is
cancelled; it is queued behind revenue, which is where it belongs. The only two things that
interrupt are a live defect on a revenue surface and a published claim that is false.

| Item | Why it matters | Blocked on | Logged |
|---|---|---|---|
| Our four fixed routes are absent from `sitemap.xml` | `/pricing`, `/guide`, `/privacy`, `/terms` became real documents on Sep 18 and nothing declares them. Also `/best-aeo-tools`. | Weekly product slice | 2026-09-19 |
| Guardrail corrections | `VERIFIED-FACTS-GUARDRAIL` is stale on three points: the free tier (no quick check since Sep 8), `/press` in sitemap (it is not), and D1 "never built" (it is live). | Weekly product slice | 2026-09-19 |
| `thesmartaiworker.com` has no sitemap | The identity property the Sep review found "not retrievable for its own domain string". Cheap to test. | Different repo | 2026-09-19 |
| `ad-flash.com` has no sitemap | Same shape, lower stakes. | Different repo | 2026-09-19 |
| Hermetic test suite | Two files need a gitignored `.env` just to collect, so a clean checkout reports failures unrelated to the code. Must be fixed BEFORE CI or day one red-gates every deploy. | Weekly product slice | 2026-09-19 |
| CI gate | The suite has never been able to block a deploy — `npm run build` does not run vitest and there is no workflow. The only gate has been a human reading output. Depends on hermetic. | Hermetic | 2026-09-19 |
| Unquotable-facts check (report change 1) | A fact only in schema or meta is a fact no engine can quote. Flagship. Our own `SoftwareApplication` is its first fixture. | Weekly product slice | 2026-09-19 |
| Competitor pre-population (report change 4) | Prefill from measured cited-instead, vendor-shaped only, labelled "we measured these — confirm or edit", with an explicit first-run fallback. | Weekly product slice | 2026-09-19 |
| Multi-page check, cheap form (report change 2) | 3–5 deterministic, printed URLs; content hash plus bytes and title; sitemap-vs-reality folded in. No full crawl. | Weekly product slice | 2026-09-19 |
| `sameAs` target validation (report change 3) | Fires only on multiple distinct commercial domains, never on LinkedIn/GitHub/Crunchbase/Wikidata/X. Retired-name case folds in here. | Weekly product slice | 2026-09-19 |
| `nosnippet` / `max-snippet` detection | Reported as an observation with its scope stated, scoring nothing — the Google-Extended resolution. | Weekly product slice | 2026-09-19 |
| Vocabulary measurement, generalised | "Does the noun a buyer would use appear where a model can read it." Measured on ourselves; nobody ships it. | Weekly product slice | 2026-09-19 |
| WO-003 Lane A — index presence | Brave API provisioned and method proven. The five-row table. | Weekly product slice | 2026-09-19 |
| WO-003 Lane B — first-200-characters check | Shares an extractor with the unquotable-facts check. | Weekly product slice | 2026-09-19 |
| Brave submission experiment | Submit after the five new documents are stable; record date, URLs, pre-submission probe as baseline; weekly re-probes with the canary. | Propagation of the Sep 18 fix | 2026-09-19 |
| Sweep positive control and nav-derived pass | The portfolio sweep had no positive control and used sitemap URLs only. | Weekly product slice | 2026-09-19 |
| Machine-readable close-out record | There are 2 `*-CLOSEOUT.md` files and 8 WO ids named in docs with no completion status, so no defensible work-order count exists for `/about`. | Weekly product slice | 2026-09-19 |
| `shellRoute` customer-facing detector | See the table above. | WO-003/B | 2026-09-19 |
| **The retired `PI GenAI LLC` spelling, 17 instances across five published posts** | Inconsistent rather than false, so it meets neither interrupt exception, and touching published body text triggers G7. **Urgency note, raised 2026-09-20:** two of the five render the retired name INSIDE the first-200-character window, so the first thing an extractor reads from those posts is a company name retired in September. That is a stronger argument than the cross-links. Also: the new primer cross-links to all five of those posts and uses the canonical `PIGENAI LLC`, so a prospect who follows a link from the primer sees two spellings of the company name one click apart. When it is cleared it is ONE pass across all five files plus the syndicated copies, never a drip — a half-cleared set is worse than an uncleared one, because it looks like two companies rather than one typo. | Weekly product slice · founder word on published body text | 2026-09-20 |
| **The byline sits above the lead on five published posts** | `postmeta` renders between the `<h1>` and the lead, so the first ~40 characters of the extractor window are spent on "PI GenAI LLC · July 2026 · 4-minute read". Measured on all five. The primer is built the corrected way and is the template default from now on. Fixing the existing five is a content edit on published posts, so it is queued rather than done. | Weekly product slice · founder word on published body text | 2026-09-20 |
| **No shared head template for the static pages** | Seven hand-written heads in `public/`. It is why the favicon, the manifest link and the analytics tag diverged from the SPA shell and stayed diverged for six months, and it will keep producing exactly this. A shared partial plus a test asserting head parity across all static pages. | Weekly product slice | 2026-09-20 |
| **`/scoreboard`** — a permanent page generated from stored sweeps, so reporting a number no longer requires writing a post | Columns: month · measurement date · branded retrievability % with N · category citation win % with N · **per-engine branded** (the engines differ and that difference is the story) · corpus presence as appearances in cited-source sets · one line on what changed · link to the stored run. Inherits the standing rules: N and confidence per cell, errored runs excluded and never scored as zeros, search-grounded separated from model-prior, transcripts retained, Unmeasured says Unmeasured. **Generated by the monthly run, never hand-edited — if the run does not happen the page says the month is missing rather than silently showing stale numbers.** Carries with it ONE edit to `/blog/i-scored-zero`, once and never again: a line at the top reading "The current number lives on the scoreboard," after which that post is a dated narrative and stops being maintained. The blog line ships only once the page exists; pointing at a page that does not is the kind of broken promise this product measures. | Weekly product slice | 2026-09-19 |
