# Handoff — AEO Analyzers: simplify the Citation Sweep input UX

> Working handoff for the Claude Code session rooted in `/mnt/c/src/aeo-app1`.
> Companion to `docs/AEO-UX-PRINCIPLES.md` (the governing UX spec).

## Context
On branch `main`, HEAD = `4c0c88e` (sweep "Build-2": plain-English headline +
collapsed transcripts already shipped). Goal now: make it easy to enter just a
URL, auto-populate the sweep questions, offer cheap-vs-deep sweep depth, and
report results in KPI-friendly language.

## Most of this already exists — reuse, don't rebuild
- `api/fetch-site.ts` — scrapes a URL (HTML + headers)
- `api/llm-generate.ts` — `POST {prompt, schema} -> {text, provider, model}`;
  server-side key; Gemini chain led by `gemini-3.6-flash`, falls back
  Gemini → OpenAI → Anthropic
- `api/run-sweep.ts` — runs the sweep; has tier quotas + timeout/cost guards
- Tiers already live: **Day Pass / Pro / Business** (Stripe + `MONTHLY_QUOTA`)
- Form UI: `src/components/SweepDashboard.tsx` (5 fields today)

## Target flow (redesign `SweepDashboard.tsx`)
1. **Start with ONE field: the URL.** Button = "Analyze".
2. **Auto-extract:** `fetch-site` → `llm-generate` to pre-fill **Brand name**,
   **Core category** (3–5 words), **Top 3 competitors**. Show them EDITABLE and
   LABELED "we guessed these — verify" (competitors are inferred, never silently
   trusted — grounded-output rule).
3. **Generate queries:** `llm-generate` with the AEO Query-Generator prompt →
   ~10 non-branded queries across **Discovery / Problem / Comparative** intents,
   plus keep 2 auto branded queries (`who is` / `what is {domain}`). Show
   collapsed under "Review the 10 questions we'll ask."
4. **Run** → plain-English scorecard, reframed to KPIs:
   **Citation Rate** (retrievability) + **Share of Model** (your mentions ÷
   you + competitors).

## HARD CONSTRAINTS (do not violate)
- **MODEL:** use the existing `gemini-3.6-flash` chain in `llm-generate.ts`.
  Do NOT introduce "Gemini 1.5 Flash" or any dated snapshot (cross-app lesson #1
  + repo `CLAUDE.md` line 46: pin the flash FAMILY chain).
- **SWEEP SIZE CAPS** (`api/run-sweep.ts`): `queries × reps <= 15`,
  `<= 84` engine calls, must finish in 300s, keep gross margin `>= 75%`.
  → 10 generated queries only fits at **N=1 rep**. Depth maps to reps/engines:
  - Quick: ~5q × 1 rep × 2 engines
  - Standard: 10q × 1 rep × 4 engines
  - Deep: 10q × 3 reps (needs the cap raised — more $)
- **Do NOT invent prices.** Any new package/SKU = founder approval + Stripe.

## Decisions the founder still owes (ASK before building those parts)
1. **Depth → existing** Day Pass/Pro/Business tiers, or **NEW package SKUs**?
2. **Field set:** 4 core (Brand, URL, Category, Competitors) + optional
   **"Primary problem"** (recommended — powers Problem-intent queries) and/or
   **"Target audience"** (skip for v1)?
3. **Uncommitted in tree:** `scripts/headless-sweep.ts` (generated the sample
   Citation Sweep report) + a `STATUS.md` line — commit or discard?

## Suggested sequence (each its own reviewable commit)
- (a) auto-extract + query-gen wired into a simplified URL-first form
- (b) depth tiers (cheap vs deep)
- (c) KPI-language report polish

## AEO KPI definitions (report language)
- **Citation Rate (Retrievability):** % of queries where the domain is actually
  cited/linked as a source in the AI's answer.
- **Share of Model (SoM):** across category answers, your brand mentions ÷ (your
  brand + competitor mentions). Needs competitors as the denominator.

## AEO Query-Generator system prompt (founder-provided)
```
You are an Answer Engine Optimization (AEO) Query Generator. Generate a fixed
set of 10 test queries a prospective buyer would type into an AI search engine
when researching a solution in the provided category. Do NOT use the Brand Name
in these queries (test organic recommendation).

INPUTS:
- Brand Name: {brand_name}
- Domain: {domain}
- Core Category: {core_category}
- Competitors: {competitors}

Generate exactly 10 queries by intent:
- Category Discovery (3): broad "best solutions in this category" questions
- Problem/Solution (3): a problem this category solves, asking for recommendations
- Comparative (4): "vs" / "alternative to {competitor}" questions

OUTPUT: valid JSON
{"sweep_queries":[{"intent_type":"Discovery|Problem|Comparative","query":"..."}]}
```

## Background extraction prompt (URL → fields, via `llm-generate`)
```
Extract the following from this website text:
1. Brand Name.
2. A 3-to-5 word Core Category describing what they sell.
3. Up to three likely competitors (names only; leave blank if not obvious).
Return as JSON: {"brand":"...","core_category":"...","competitors":["...","...","..."]}
```
