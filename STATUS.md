# AEO Analyzers — Production Status (source of truth)

**App:** AEO Analyzers · **Live:** https://www.aeoanalyzers.com · **Repo:** lhiebert01/aeoanalyzers
**Publisher:** PI GenAI LLC · **Founder:** Lindsay Hiebert
**Version:** v1.6.0 · **Last updated:** 2026-07-01 · **Hosting:** Vercel (project `aeo-app1`)

> **v1.6.0 (2026-07-01):** Closed five AEO blind spots from an independent audit:
> (1) **AI crawler-access gate** — `api/fetch-site` now returns robots.txt + llms.txt;
> `src/lib/crawlerAccess.ts` audits AI-bot allow/deny and **caps the headline score at 40**
> (with a red banner) when a citation-critical bot is blocked. (2) Connected-`@graph` schema
> with correct `@type`, `Offer`/`priceSpecification`, WebSite+SearchAction, founder Person.
> (3) Entity-graph/portfolio audit. (4) Passage-level extractability. (5) Custom-stack detection
> in the Implementation Roadmap (`src/lib/platformDetect.ts`). See RELEASE-NOTES.md.

> **v1.5.1 (2026-06-21):** Grounded-only output — the analyzer never emits a number/rating/claim
> not on the analyzed page (new `src/lib/claimsSafety.ts` backstop in `applyAccuracyGuards`), and
> our own marketing site's fabricated `aggregateRating` + invented testimonials were removed. See
> RELEASE-NOTES.md.

> One-page "where is this app" reference. Update the version line + the relevant
> section whenever something material ships. Detailed history lives in
> RELEASE-NOTES.md / CHANGELOG.md.

---

## At a glance

| Area | Status |
|---|---|
| Core product (AEO analysis) | ✅ Live |
| AI model | Gemini 3.5 Flash → 3.1-flash-lite → 2.5-flash → 2.5-flash-lite (fallback chain) |
| AI-crawler visibility (prerender) | ✅ Live — `/` prerendered, body + JSON-LD crawlable |
| Payments (Stripe) | ✅ Configured & live — **needs one real test purchase to confirm end-to-end** |
| Free-tier value gate | ✅ Live (diagnosis free, fixes paid) |
| Day Pass ($24 one-time / 24h) | ✅ Live |
| Subscriptions (Pro $49 / Business $199) | ✅ Wired (price IDs + secret key + webhook all set) |
| Database | Supabase (Postgres + Auth + RLS) |

---

## Production environment variables (Vercel `aeo-app1`, Production)

Values are NOT recorded here — names + purpose only.

| Var | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini AI analysis (server) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase client (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side writes (webhook) |
| `VITE_APP_URL` | Base URL for redirects |
| `STRIPE_SECRET_KEY` | Stripe API (checkout + portal) — standard `sk_live_` key |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures (`whsec_`) |
| `VITE_STRIPE_PRICE_ID_PRO` | Pro $49/mo price (`price_1TMYOU…`) |
| `VITE_STRIPE_PRICE_ID_BUSINESS` | Business $199/mo price (`price_1TDiBm…`) |
| `VITE_STRIPE_PRICE_ID_REPORT` | Day Pass $24 one-time price (`price_1Td1ai…`) |

**Stripe webhook:** endpoint `we_1TDicx…` → `https://www.aeoanalyzers.com/api/webhook`, events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. (Repointed 2026-05-31 from a stale Cloud Run URL that was failing 100%.)

**Supabase schema note:** `users` table has `report_pass_until timestamptz` (added 2026-05-31) — drives the 24h Day Pass.

---

## Features that work (capabilities)

**Analysis**
- 0–100 AEO score (Entity×0.3 + Density×0.3 + Clarity×0.2 + Structure×0.2), Citation Probability, brand-type detection (editorial/news/saas/ecommerce/service), Competitive Duel.
- **AI crawler-access gate (v1.6):** robots.txt/llms.txt audit vs. major AI bots; blocked citation-critical bot → headline score capped at 40 + red banner. Deterministic (`src/lib/crawlerAccess.ts`).
- **Entity-graph/portfolio audit + passage-level extractability (v1.6):** sameAs/founder/NAP resolution; pronoun-led passages get entity-anchored rewrites.
- **Connected-`@graph` JSON-LD (v1.6):** single graph, `@id` cross-refs, correct `@type`, `Offer`/`priceSpecification`. Platform detection (`src/lib/platformDetect.ts`) tailors the roadmap.

**Trust & accuracy (v1.4)**
- Brand-aware recommendations (editorial voice protected), provenance-split JSON-LD (Verified vs Candidate), honest OfferCatalog (≤4 user-facing services), `SCHEMA_MISSING` gap category, capability-scoped questions, calibrated/isolated scoring. Regression suite: `npm test` (vitest).

**Advanced diagnostics**
- Citation Hook Density, E-E-A-T Author Audit, LLM Summarization Test, Zero-Click/Snippet Predictor, Query-to-Content Gap, Semantic Chunking.

**Output**
- Paste-ready JSON-LD, content rewrites, meta-description rewrite, prioritized checklist, Word (.docx) report, web-team handoff template, score rating table, "What is JSON-LD" explainer.

**Monetization**
- Free: one full diagnosis (scores + gaps); the specific fixes are gated.
- Day Pass: $24 one-time → 24h full access (no subscription).
- Pro $49/mo, Business $199/mo.
- Admins (lindsay.hiebert@gmail.com) and active passholders bypass the gate.

**Discoverability**
- `/` prerendered for AI crawlers (build-time headless Chromium via @sparticuz/chromium), `/llms.txt`, robots.txt, sitemap.xml.

---

## Build / deploy

- `npm run build` = `vite build && node scripts/prerender.mjs` (prerender is fail-open). `build:nopre` skips prerender.
- `npm test` = vitest regression suite. `npm run lint` = tsc.
- Vercel auto-deploys on push to `main` (GitHub integration). `vercel --prod --yes` also works (authed as lhiebert01). Avoid stacking CLI + auto deploys (causes queue backup).
- `vercel.json` SPA rewrite excludes `/assets/` so hashed chunks 404 cleanly; `main.tsx` auto-reloads stale tabs on `vite:preloadError`.

---

## Known pending / follow-ups

- [ ] **Confirm payments end-to-end** with one real (or Stripe-test-mode) purchase → webhook delivery should flip to "succeeded".
- [ ] **Rotate the GitHub PAT** embedded in the git remote URL (plaintext `ghp_…`).
- [ ] Approval-gated copy fixes: drop "Official"/"world's first"; reconcile `og:title` vs `<title>` (both crawlable now).
- [ ] Optional: add a small Stripe product image + "Marketing feature list" bullets to the Day Pass product in Stripe.
- [ ] Other portfolio sites (getmacrolens apex/canonical, bookmobile pricing, sanctumshield head+Colorado law) — see `c:\src\macrolens\docs\` audit + runbook.

See **docs/go-to-market-plan.md** for the marketing/sell roadmap.
