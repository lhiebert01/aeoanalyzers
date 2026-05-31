# Prerender Plan — Make aeoanalyzers.com crawlable by AI engines

**Status:** implemented in the PR that adds `scripts/prerender.mjs`.
**Owner:** Lindsay Hiebert · 2026-05-30
**Why this is P0:** AEO Analyzers is a Vite + React SPA. A raw fetch returns an
empty `<div id="root"></div>` — the body, value props, and the (client-injected)
JSON-LD never reach non-JS crawlers (ClaudeBot, GPTBot, PerplexityBot,
Google-Extended). For a product whose entire premise is *AI visibility*, being
invisible to AI is existential. This is confirmed: `dist/index.html` ships ~47
bytes of body and no value-prop text.

## Constraints that shape the approach

- **Single-URL, state-based routing.** There is no react-router; the app drives
  views off a `view` state variable (default `'landing'`). So there is exactly
  **one** URL to prerender: `/` (the anonymous `MarketingLanding`). Route-crawling
  prerenderers (react-snap, vite-plugin-prerender) have nothing to crawl.
- **Heavy browser-API usage.** `App.tsx` touches `window`, `localStorage`, the
  Supabase client, and `react-helmet-async` at render — so `react-dom/server`
  `renderToString` of `<App/>` would crash without a large refactor. A **real
  browser** sidesteps all of it.
- **JSON-LD is client-injected** via react-helmet-async (`SEO.tsx` +
  `lib/json-ld.ts`). A real-browser snapshot captures it into static `<head>`
  for free — so rendering is the one fix that unlocks body + meta + schema.

## Approach: post-build headless-Chrome snapshot of `/`

1. `vite build` produces `dist/` (empty-shell `index.html`).
2. `scripts/prerender.mjs`:
   - serves `dist/` on a local port (tiny static server, SPA fallback to index.html),
   - launches headless Chromium (puppeteer) in a **clean context** (no cookies /
     localStorage → renders the anonymous landing),
   - navigates to `/`, waits for network idle and the hero (`#hero-title`),
   - serializes the full document and **overwrites `dist/index.html`**.
3. Humans still get the SPA: React 19 `hydrateRoot` reconciles the snapshot
   (first client render is also `view='landing'`, so hydration matches).

Wired via `package.json` `build` = `vite build && node scripts/prerender.mjs`
and `vercel.json` `buildCommand` = `npm run build`.

### Fail-open
If Chromium can't launch (e.g., a constrained CI container), the script logs a
warning and exits 0 **without** modifying `dist/index.html`. Worst case we ship
the same SPA shell as today — never a broken build. The live acceptance test
below reveals whether the snapshot actually ran in production.

## Acceptance test (run against the live deploy)

```
curl -ksS -A "ClaudeBot" https://aeoanalyzers.com/ | grep -iE 'Citation|Simulation Engine|Secure your' && echo PASS:content-visible
curl -ksS -A "ClaudeBot" https://aeoanalyzers.com/ | grep -o 'application/ld+json' && echo PASS:json-ld-present
curl -ksS -A "ClaudeBot" https://aeoanalyzers.com/ | grep -q '<div id="root"></div>' && echo 'FAIL:still empty shell' || echo 'PASS:shell-hydrated'
```

## Risks & mitigations

- **Puppeteer on Vercel build** — needs Chromium + build time/memory. Mitigation:
  fail-open; if Vercel can't run it, fall back to `@sparticuz/chromium` +
  `puppeteer-core`, or an on-demand prerender (prerender.io) via a bot-UA rewrite.
- **Hydration mismatch** — mitigated because the snapshot is the anonymous
  landing, which equals React's first client render. Motion animations may be
  captured mid-transition (opacity), but crawlers read DOM text regardless.
- **Snapshot staleness** — the snapshot is regenerated every build, so it tracks
  the landing content automatically.

## Out of scope (separate, approval-gated)

- Copy/claim edits flagged by the audit (`og:title` "Official" vs `<title>`,
  "world's first") — these are crawlable today and worth fixing, but are copy
  changes that need sign-off.
- `llms.txt` is included in this PR (additive, audit-recommended, low-risk).
