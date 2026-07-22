# Release Notes

## v1.6.0 — July 1, 2026

### Closing the AEO blind spots an independent Claude.ai audit found

An independent review of a real analyzer report (pigenai.com) flagged five gaps
where the report scored a site strongly while missing foundational AEO factors.
All five are now addressed:

- **AI crawler access (foundational, can silently zero out everything else).**
  The analyzer now fetches the site's `robots.txt` and probes for `/llms.txt`,
  then audits them against the major AI/answer-engine user-agents (`GPTBot`,
  `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-User`, `Google-Extended`,
  `PerplexityBot`, and more — see `src/lib/crawlerAccess.ts`). **If a
  citation-critical bot is blocked, the headline AEO score is CAPPED at 40** and
  a red "AI crawlers are blocked" banner leads the report — no site can score 90
  while the engines it's optimizing for are locked out. Also detects the *edge*
  failure modes a robots.txt read alone can't see (the ones from FIX 0 of the
  remediation guide): `X-Robots-Tag: noindex` / `<meta robots noindex>`, the
  Cloudflare *managed* robots.txt / `Content-Signal: ai-train=no` edge block
  (surfaced with the exact Cloudflare-dashboard fix steps, since it can't be
  fixed in the repo). 100% deterministic; the LLM is not involved in this gate.
- **Connected-`@graph` schema with correct `@type` discipline.** Generated
  JSON-LD is now ONE `@graph` with `@id` cross-references instead of disconnected
  blocks: `Organization` ↔ `WebSite` (with `SearchAction` when search exists) ↔
  `SoftwareApplication`/`Service` (chosen by product type) ↔ founder `Person`.
  Real prices become a structured `Offer` + `priceSpecification` instead of the
  weak `"priceRange": "$5,000+"` string. The offer-catalog cap/architecture
  filter now traverses `@graph`.
- **Entity-graph / portfolio audit.** New card assessing reciprocal `sameAs`, a
  single canonical founder `Person`, and NAP consistency — because AI resolves a
  brand to one authoritative entity at the portfolio level, not the page level.
  `sameAs` URLs are stripped unless they actually appear on the page.
- **Passage-level extractability.** New diagnostic that flags pronoun-led
  passages ("We build…") with no entity anchor and proposes self-contained,
  entity-named answer sentences — grounded (no invented numbers), surgical
  anchoring, not a voice change.
- **Custom-stack detection.** The Implementation Roadmap now detects the
  publishing stack (WordPress/Shopify/Wix/HubSpot vs. custom-coded Next.js/React)
  and leads with the right guidance — no more WordPress-plugin instructions for a
  hand-coded Vercel site.

Regression coverage added in `src/__tests__/aeoGaps.test.ts` (22 tests).

### Dogfooding: applied the same playbook to aeoanalyzers.com's own site

- `public/robots.txt` now carries an explicit AI-bot allowlist (ClaudeBot,
  GPTBot, OAI-SearchBot, PerplexityBot, Google-Extended, …) — the exact fix the
  product recommends.
- `public/llms.txt` corrected: removed the inaccurate "simulates multiple AI
  engines" claim (it uses a single Gemini frontier model), added the $24 Day
  Pass, and a verifiable founder/portfolio line.
- `src/lib/json-ld.ts` is now one connected `@graph` (`Organization` ↔ founder
  `Person` w/ Credly + CISSP `hasCredential` ↔ `WebSite` ↔ `SoftwareApplication`)
  with `parentOrganization`/`sameAs` reciprocity to `pigenai.com/#org`.
  (Founder street address intentionally omitted from public schema.)

## v1.5.1 — June 21, 2026

### Grounded-Only Output: the analyzer (and our own site) never fabricate a fact

A real audit caught the analyzer doing the one thing an AEO tool must never do: **emitting invented values that users paste onto real sites.** The page *detection* was solid; two *generators* fabricated data:

- The "Candidate Schema (Verify Before Pasting)" appendix emitted an invented `aggregateRating` (e.g. `ratingValue: "4.9"`, `reviewCount: "120"`). Publishing fake review stars is an FTC deceptive-practice + Google structured-data-spam risk. A "verify before pasting" label is not enough — people paste anyway.
- The "Adjective-to-Metric" rewriter and checklist invented unverifiable claims (e.g. "a 70% pass rate", "average exam score indicators") that were nowhere on the source page — i.e. advising customers to publish false advertising.

**Core principle now enforced in code:** the tool may re-express what is actually on the analyzed page more citably; it may **never** manufacture a fact, rating, statistic, percentage, pass rate, guarantee, or outcome that the page does not contain — in any section, including "candidate" blocks.

#### What changed
- **New claims-safety backstop** (`src/lib/claimsSafety.ts`) runs over the full assembled report inside `applyAccuracyGuards`, with the analyzed page's text as ground truth:
  - Strips fabricated `aggregateRating` / `review` nodes and any ungrounded numeric value (price, counts, founding year, …) from **every** generated JSON-LD block, including the candidate block.
  - Drops any content rewrite whose "proposed" text introduces a number or unverifiable claim (guarantee, pass rate, credential) not present on the page or in the original phrase.
  - Strips ungrounded numbers from the meta-description rewrite.
  - Reframes checklist/recommendation items that say "add statistics/ratings/reviews" into conditional advice ("only if you can substantiate it with real, verifiable data").
  - Anything stripped is disclosed via a new `claimsSafetyRemoved` field.
- **Generator prompts tightened**: candidate schema must use empty template slots (`"<only if you have real, verifiable reviews>"`) never plausible numbers; the rewriter is explicitly forbidden from introducing new numbers/claims; the checklist is told never to advise publishing unprovable metrics.
- **Our own marketing site cleaned up** (same discipline, applied to ourselves):
  - Removed the fabricated `aggregateRating` (4.9 / 124 reviews) and the two invented testimonials ("Sarah J.", "Mark T.") from both the JSON-LD and the visible landing page.
  - Corrected the `SoftwareApplication` price range (`highPrice` 99 → 199, `offerCount` 3 → 4) to match real plans.
  - Reworded a stale `twitter:description` that implied we query ChatGPT/Perplexity directly — we analyze the universal citation signals those engines use, powered by Google Gemini 3.5.
- **Tests:** 9 new regression tests (feed a page with no reviews/stats → assert nothing fabricated ships; a page that *does* contain real reviews → assert they pass through).

---

## v1.5.0 — May 31, 2026

### AI-Crawler Visibility, Live Payments & the $24 Day Pass

The release that makes AEO Analyzers practice what it sells and take money for the first time.

#### Crawlable by AI engines (prerender)
- The Vite SPA shipped an empty `<div id="root">` shell — invisible to AI crawlers, fatal for an AEO product. `scripts/prerender.mjs` now renders `/` (the anonymous landing) at build time via headless Chromium and writes full HTML — body + react-helmet meta + JSON-LD — into `dist/index.html`. Verified live: crawler view returns a ~47 KB body + JSON-LD (was 47 bytes).
- Uses **puppeteer-core + @sparticuz/chromium** (full puppeteer's Chromium can't launch on Vercel's build — `libnspr4.so` missing). Fail-open + 120s watchdog so it can never break/hang a build.
- Added `public/llms.txt`.

#### Payments live (Stripe) — first-time configuration
- Production was never actually wired to Stripe (no keys in Vercel; webhook pointed at a dead Cloud Run URL, 100% failing). Now configured: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and Pro/Business/Day-Pass price IDs in Vercel; webhook repointed to `https://www.aeoanalyzers.com/api/webhook` with `checkout.session.completed` + subscription events.
- Pro ($49/mo) and Business ($199/mo) checkout now function.

#### $24 Day Pass (one-time, 24h full access)
- One-time purchase grants 24h of full access (`users.report_pass_until`), then auto-expires to free — built for the single-site user who won't subscribe. Reuses checkout/webhook; `mode: 'payment'`; surfaced as a bulleted card on the Pricing page. New Supabase column `report_pass_until timestamptz`.

#### Docs
- Added `STATUS.md` (production source-of-truth), `docs/go-to-market-plan.md`, `docs/blog-relaunch-2026.md`, `docs/prerender-plan.md`.

---

## v1.4.0 — May 29, 2026

### Trustworthy AEO: Brand-Aware Analysis, Provenance-Safe Schema & Accurate Scoring

v1.3 made reports actionable. v1.4 makes them **trustworthy** — the kind of report you can hand straight to your web team without re-checking it. Driven by a real audit that exposed five accuracy failures, this release rebuilds the recommendation pipeline so a sophisticated brand owner won't catch it making basic errors. The architecture pairs each prompt-level instruction with a deterministic guard (`applyAccuracyGuards`) that enforces the rule in code regardless of model output, backed by a `vitest` regression suite.

#### Brand-type classifier (`siteType`)
- New `src/lib/brandType.ts` classifies a site as editorial / news / SaaS / ecommerce / service before any recommendation runs, and selects the right voice rules.
- **Editorial/news voice protection:** suppresses "adjective-to-metric" rewrites entirely (frontier LLMs prefer natural editorial prose for citation) and replaces them with **Schema-Density Opportunities**.

#### Provenance-tagged schema (`verifiedSchema` / `candidateSchema` / `schemaProvenance`)
- JSON-LD is split into **Verified — safe to paste** (detected values only, with source quotes) and **Candidate — verify before pasting** (inferred values, flagged with a warning). Inferred values can never reach the paste-into-`<head>` target.

#### Honest OfferCatalog (`offerCatalogRemoved`)
- New `src/lib/offerCatalog.ts` strips internal architecture terms (Layer/Engine/Framework/Model/Pipeline/System/…) and caps the catalog at the 4 strongest user-facing services; removed items are disclosed.

#### "Schema only" gap category (`gapCategory`)
- New `src/lib/queryGap.ts` adds a fourth category distinguishing genuinely missing content from content present in prose but not in FAQ schema. The latter recommends *wrapping existing content* (with the on-page source quote), not writing duplicates.

#### Capability-scoped questions
- Two-pass query generation keeps only questions matching detected capabilities or universally-useful topics (pricing, founder, contact, compliance); drops advice about features the site doesn't offer.

#### Scoring isolation & calibration
- The numeric score is isolated from recommendation framing so it stays comparable run-over-run; editorial prose is no longer penalized on density for low statistic counts.

#### Reliability hardening
- **Model chain corrected to current stable IDs:** `gemini-3.5-flash` → `gemini-3.1-flash-lite` → `gemini-2.5-flash` → `gemini-2.5-flash-lite` (the old preview IDs were deprecated/incorrect and 503'd).
- **`safeJsonParse`** salvages trailing-comma/fenced/prose-wrapped model output at every parse site; `maxOutputTokens` raised 8192 → 32768.
- **DOCX download fix:** stale-chunk-after-deploy resolved — `vercel.json` no longer rewrites `/assets/*` to `index.html`; a `vite:preloadError` listener auto-reloads stale tabs; the download handler recovers gracefully.

#### UI / report surfaces updated
- Advanced Analysis cards (brand-type badge, schema-density card, OfferCatalog disclosure, new gap copy with source quotes), web-team handoff template, and DOCX appendices all reflect the verified/candidate split and new gap categories.

#### Self-audit
- Live re-audit of getmacrolens.com on `gemini-3.5-flash`: **91/100** with all five accuracy failures resolved.

---

## v1.3.0 — March 30, 2026

### Enhanced Actionable Reports & Comprehensive JSON-LD (Phase 4)

The existing AEO report delivered scores and generic instructions. v1.3 makes every report specific, actionable, and deploy-ready — with comprehensive schema covering ALL detected products/services, before/after content rewrites from the actual page, and a prioritized implementation checklist.

#### Comprehensive Schema (`comprehensiveSchema`)
- **Full OfferCatalog JSON-LD:** Generates a complete JSON-LD block with `@type Organization` + `hasOfferCatalog` listing EVERY product, service, and capability detected on the page
- **Industry-Standard Terminology:** Each offer uses technical/industry terms instead of marketing adjectives
- **Gap-Aware:** "Missing" items from the Query-to-Content Gap analysis are mapped into additional schema entries
- **Ready to Deploy:** Output is a valid, paste-ready `<script type="application/ld+json">` block

#### Content Rewrite Examples (`contentRewrites`)
- **Adjective-to-Metric Pivot:** 3-5 before/after rewrites from the ACTUAL analyzed content
- **"Current (Low Citation)" → "Proposed (High Citation)":** Replaces vague marketing language with specific metrics, protocols, specs, and measurable claims
- **Page Context:** Each rewrite identifies which page section the text comes from

#### Meta Description Rewrite (`metaDescriptionRewrite`)
- **Current vs. Suggested:** Extracts the actual meta description and proposes a rewrite replacing marketing fluff with technical specifics
- **Character Limit Aware:** Suggested rewrite stays under 160 characters

#### Implementation Checklist (`implementationChecklist`)
- **5-8 Categorized Actions:** Technical, Authority, Structural, Editorial, and Coverage categories
- **Priority Tags:** Each item marked High, Medium, or Low priority
- **Specific and Actionable:** Items reference the actual analysis findings (e.g., "Paste the comprehensive JSON-LD into the site header")

### DOCX Report — 5 New Appendix Sections
- **Appendix A: Comprehensive Schema (Ready to Deploy)** — Full JSON-LD in Courier New with deployment instructions
- **Appendix B: Content Rewrite Examples** — Table format: Page | Current (Low Citation) | Proposed (High Citation)
- **Appendix C: Meta Description Rewrite** — Current vs. Suggested with explanation
- **Appendix D: Knowledge Gap Action Table** — Maps each query gap question to a status and specific required action (Missing → create content, Partial → expand, Strong → no action)
- **Appendix E: Implementation Checklist** — Color-coded priority tags: `[ ] [HIGH] Technical: ...`

### Implementation Roadmap UI Enhancements
- **Summary Tab:** Shows comprehensive schema (all products & services) instead of basic snippet when available, with fallback to `schemaSnippet`
- **Handoff Email Template:** Now includes comprehensive schema block, content rewrite examples, knowledge gap FAQ table, and prioritized implementation checklist

### Backward Compatibility
- All 4 new `AnalysisResult` fields are optional — old history records unaffected
- Appendix sections only render when data exists
- `schemaSnippet` remains as fallback if `comprehensiveSchema` is absent

### Files Changed
- `src/services/geminiService.ts` — 4 new interface fields, enhanced Gemini prompt, response schema additions
- `src/services/docxGenerator.ts` — 5 appendix sections before footer
- `src/components/ImplementationRoadmap.tsx` — Summary tab schema upgrade, handoff template enhancements

---

## v1.2.0 — March 30, 2026

### DOCX Report Download (Phase 1)
- **Professional Word Document:** One-click download of a full AEO Analysis Report as `.docx`, generated entirely in-browser
- **12-Section Report:** Title page (with user name, AEO Score, Citation Probability), Why This Matters, Executive Summary, Score Breakdown, Areas Needing Improvement, Areas of Strength, Top 3 Priorities, Implementation Instructions (A-D), Platform Instructions, Rollout Plan, Success Criteria, Full Recommendations
- **Dynamic Import:** DOCX generation uses `await import('docx')` for code-splitting — zero impact on initial page load (~11KB separate chunk)
- **Advanced Analysis Included:** All Phase 3 advanced features automatically appear in the report when data exists
- **"Prepared by" Attribution:** Report displays the user's display name from their Supabase profile

### Transparent AEO Score Formula (Phase 2)
- **Score Breakdown Card:** Visual 4-column grid showing Entity (30%), Density (30%), Clarity (20%), Structure (20%) sub-scores with progress bars
- **Formula Display:** `Score = E×0.3 + D×0.3 + C×0.2 + S×0.2` shown below the breakdown — fully transparent and verifiable
- **Gemini Prompt Updated:** AI now computes and returns all four sub-scores; overall score must equal the weighted formula (rounded)

### Advanced Analysis — Citation Hook Density (Phase 3a)
- **Factual Density Score (0-100):** Measures how rich content is with citable facts
- **Stats & Percentages Count:** Counts specific data points on the page
- **Top 3 Citable Sentences:** Surfaces the most quotable sentences from the content

### Advanced Analysis — E-E-A-T Author Audit (Phase 3a)
- **Author Detection:** Checks for author attribution, Schema.org/Person, LinkedIn links
- **Generic Author Flag:** Warns when author is "Admin", "Staff", "Team", etc.
- **Trust Signals & Warnings:** Lists all detected trust signals and flags E-E-A-T issues
- **E-E-A-T Score (0-100):** Overall trust signal composite

### Advanced Analysis — LLM Summarization Test (Phase 3b)
- **Metadata vs. Reality:** Compares what meta title/description says the page is about vs. what AI actually understands
- **Alignment Rating:** Aligned / Vague / Misaligned with explanation
- **Unique Differentiator:** No other tool tests whether AI "gets" what your page is really about

### Advanced Analysis — Zero-Click Predictor (Phase 3b)
- **Snippet Opportunities:** Identifies text blocks that should be tables or lists for Featured Snippets
- **Suggested Formats:** Recommends specific restructuring (table, ordered list, definition list) with reasoning
- **Featured Snippet Readiness (0-100):** Composite score for snippet optimization

### Advanced Analysis — Query-to-Content Gap (Phase 3c)
- **Top 10 Niche Questions:** AI generates the questions users in your industry would actually ask
- **Answer Quality Rating:** Each question rated Strong / Partial / Missing
- **Gap Score (0-100):** 100 = all questions answered strongly, 0 = none answered

### Advanced Analysis — Semantic Chunking (Phase 3c)
- **Long Block Detection:** Finds content blocks >150 words without proper headings
- **Suggested Headings:** AI proposes specific heading text for each long block
- **Chunking Score (0-100):** 100 = perfectly chunked, 0 = wall of text

### Advanced Analysis UI
- **New `AdvancedAnalysisCards.tsx` Component:** 6 cards in a responsive 2-column grid, each rendering only when its data exists
- **Design Consistency:** Matches existing app design (white bg, zinc borders, rounded-3xl, lucide icons, ScoreBadge components)
- **Backward Compatible:** Old history records render fine — new cards simply don't appear for records without advanced data

### Database Connectivity Fix
- **Cached Access Token:** REST API helpers (`supabaseQuery`, `supabaseInsert`, `supabaseUpdate`) no longer call `supabase.auth.getSession()` on every request — which was causing hangs in production
- **Token Set Once:** Access token cached via `setAccessToken()` during auth initialization; cleared on sign-out
- **Fixes:** History loading, Admin Dashboard user list, save-to-DB, usage count updates — all previously hanging

### Backward Compatibility
- All new `AnalysisResult` fields are optional (`?`) — old history records stored as JSON continue to render correctly
- No database schema changes required
- DOCX generator checks for field existence before adding sections

---

## v1.1.0 — March 26, 2026

### Authentication & Security
- **Google OAuth:** Full Google sign-in support via Google Cloud Console + Supabase. Works for all users (app published to production).
- **Sign Out Fix:** Non-blocking sign out that clears all storage and forces page reload. No more hanging on sign out.
- **Auth Hang Fix:** Added 3-second safety timeout and immediate session check via `getSession()`. Page no longer hangs on refresh when Supabase auth is slow.
- **Free Tier Gate:** 1 free analysis per user, then upgrade required. Usage tracked server-side in Supabase (cannot be bypassed by clearing cookies).

### Analytics
- **GA4 Integration:** Google Analytics 4 fully configured with Measurement ID `G-WRY4D9ZS8E`. Tracks page views, scroll, login, form starts, and session events.
- **Admin GA4 Link:** "Open GA4" button in SuperAdmin Dashboard links directly to the GA4 property dashboard.

### Branding & Messaging
- **Consistent Branding:** All instances of "AEO Analyzer" (singular) updated to "AEO Analyzers" (plural) across the entire codebase — header, footer, SEO metadata, privacy policy, terms, FAQs, press kit, and handoff template.
- **Header Update:** Now reads "AEO ANALYZERS" matching the domain `aeoanalyzers.com`.
- **New Positioning:** "Multiple AI Engines. One Score. 90 Seconds." — emphasizes multi-engine simulation vs single-algorithm legacy tools, and the speed advantage over manual web team audits.
- **Updated SEO:** All meta descriptions, OpenGraph tags, JSON-LD structured data, and page titles updated with new messaging.

### Analysis & Reporting
- **Spinner Fix:** Analysis spinner now clears immediately when results are ready. Database saves (history + usage count) run in the background instead of blocking the UI.
- **History Reliability:** History tab no longer hangs on repeated navigation. Error handling ensures loading state always clears.
- **History Detail View:** "Viewing Saved Analysis" banner with URL displayed when viewing historical results. "View" column added to history table. Click any saved analysis to see full results including score breakdown, recommendations, and roadmap.
- **Null Safety:** Handles missing `full_result` in history records gracefully with user-friendly error message.

### Handoff Template Enhancements
- **JSON-LD Explanation:** Added blue info box explaining what JSON-LD is and how to add it on each platform.
- **Full Report Content:** Template now includes the analyzed URL, overall AEO score, AI-generated summary, key findings with individual scores, and the complete JSON-LD snippet.
- **Platform Guides:** Added HubSpot (Settings > Website > Pages > Site Header HTML) and Wix (Settings > Custom Code > Head) implementation guides alongside existing WordPress, Shopify, and Custom Code guides.

### Bug Fixes
- Fixed double-S typo ("AEO Analyzerss") in footer, privacy policy, and terms of service.
- Fixed fetch proxy 403 errors with full Chrome browser headers and www/non-www retry.

---

## v1.0.0 — March 26, 2026

### Initial Release (Supabase + Vercel Migration)
- Complete migration from Firebase/Cloud Run (~$200/day) to Supabase/Vercel (~$10/month) — 99.8% cost reduction.
- React 19 + TypeScript SPA with Tailwind CSS v4 and Motion (Framer Motion).
- Supabase Auth (email + password) with Row Level Security.
- Google Gemini API integration for AI-powered website analysis.
- Vercel serverless API routes for site fetching, Stripe checkout, billing portal, and webhooks.
- Stripe subscription billing (Free, Pro, Business tiers).
- SuperAdmin Dashboard with user management and growth metrics.
- Analysis History with database persistence.
- Competitive Duel mode for head-to-head website comparison.
- Implementation Roadmap with JSON-LD code snippets (Pro feature).
- Press Kit with blog post, press release, and social media templates.
- SEO component with OpenGraph, Twitter Cards, and JSON-LD structured data.
- Marketing Landing page with personas, FAQ, and testimonials.
- Custom domain `aeoanalyzers.com` with Vercel SSL.
- GitHub CI/CD with auto-deploy on push to main.
