# AEO Analyzers — repo guidance

**Production source of truth:** `STATUS.md`. Detailed history: `RELEASE-NOTES.md`.

## The feature test (WO-AEO-ADDENDUM-002 #5) — non-negotiable

> Every proposed feature must pass: **"Does this make the answer layer more
> accurate, or does it exploit its blind spots?"**

Exploit-class features are **rejected regardless of demand**:
- Auto-adding the referring/source URL as an outbound link on the client's site
  (parasite gimmick; causality runs the other way — inbound presence drives discovery).
- Parasite-SEO seeding (content hosted on high-authority platforms purely to borrow
  their ranking — e.g. Perplexity-Pages seeding, host-domain article farming).
- Per-vendor `llms.txt` variants / cloaking (serving different signals to different bots).
- Scare-binary scoring (presenting a Layer-3 category-citation zero as "AI can't find you").

We win on **measurement honesty**: report the three separable layers (retrievability,
fidelity, citation win), each with its own fix path, every score backed by a stored transcript.

## Grounded output (never fabricate)
Anything the app generates for a user to publish — schema/JSON-LD, rewrites, marketing
snippets — must only re-express values that exist in the source. Never emit an invented
number/rating/claim, not even as a labeled placeholder. `src/lib/claimsSafety.ts` is the
deterministic backstop in `applyAccuracyGuards`. This applies to our OWN marketing site too.

## Audit what is SERVED, not what is authored (ADDENDUM-002 #1)
The scanner fetches the **live** `/robots.txt`, `/llms.txt`, sitemap, and rendered HTML over
HTTP (via `api/fetch-site`) — never repo/CMS/plugin config. When multiple robots sources can
coexist (Next.js route + static file + plugin), flag which one actually wins.

## Architecture map (post-platform WOs)
- Deterministic cores (LLM-free, tested): `src/lib/` — `crawlerAccess`, `indexCoverage`,
  `citationSweep`, `botClassify`, `truthRecord`, `fidelity`, `factClassification`,
  `namespaceCollision`, `authorityGap`, `pickRate`, `driftDiff`, `platformDetect`, `claimsSafety`.
- Server routes: `api/` — `run-sweep` (WO-1), `score-fidelity` (WO-2), `bot-hit`/`bot-stats` (WO-3),
  `pick-rate` (WO-4), `drift-check` (WO-5), `action-plan` (WO-6), `authority-gap` (WO-7),
  `fetch-site`, Stripe (`create-checkout-session`/`create-portal-session`/`webhook`).
- Provider adapters (server, key-gated): `api/_lib/engines.ts` (Claude/OpenAI/Perplexity/Gemini).
- Migrations: `supabase/migrations/*.sql` (run manually in Supabase SQL editor).
- Dashboard: `src/components/SweepDashboard.tsx` (Sweeps nav tab).

## Build / test
- `npm test` — vitest (deterministic-core suites). `npx tsc --noEmit` — typecheck (whole project incl. `api/`).
- `npm run build` = vite build + prerender (fail-open). `npm run build:nopre` skips prerender.
- Models: pin FAMILY aliases (`claude-opus-4-8`, Gemini flash chain) — never dated snapshots.
- Secrets: env only (Vercel/Supabase dashboards + gitignored `.env`); never hardcode; `$ENV_VAR` in allow-rules.
