# AEO Analyzers — Official Baseline (N=5 self-sweep, 2026-07-31)

**Post-A/B/C1 baseline of record.** Gates the honest-zero series + all public claims.
Reproduce: `EXEC_DOMAIN=aeoanalyzers.com EXEC_REPS=5 … npx tsx scripts/exec-report.ts`
(10 category + 2 branded queries × 5 reps × 4 engines = 240 runs, ~$2.71).
Metrics of record: `aeoanalyzers-N5-2026-07-31.json` (full transcripts kept locally in `exec-out/`, gitignored).

## Headline scorecard (grounded, search-grounded runs only)

| Metric | Result | N | Confidence |
|---|---|---|---|
| Found when asked by name (branded retrievability) | **98%** | 40 | high |
| Recommended to new buyers (category win) | **0%** | 162 | high |
| Your own site cited (owned citation rate) | **54%** | 39 | high |
| Your share of the category | **0%** | 562 | high |

Model-prior (answered without live search, excluded from win): 23 runs · 0% model-prior visibility.

## Per-engine

| Engine | Branded | Category win | Model-prior | Truncated |
|---|---|---|---|---|
| Claude | 10/10 (100%) | 0% · N=50 | 0 | 0 |
| ChatGPT | 10/10 (100%) | 0% · N=29 | **21** | 0 |
| Perplexity | 10/10 (100%) | 0% · N=50 | 0 | 0 |
| Gemini | 9/10 (90%) | 0% · N=33 | 2 | **15 → COLUMN BLOCKED** |

## Fidelity / entity-linking

- **Fidelity: 39 cited-accurate, 0 drifted, 0 issues.** (The PIGENAI-LLC false positive from the dogfood is gone.)
- **Entity-linking collisions (reproduced + richer at N=5):** aeoaudittool.com, aeoanalytics.com, aeo-analytic.com, Wikipedia AEA/AER/AEM/AE/AEi Systems/AEA Investors, stock-ticker pages (yahoo.com, benzinga.com, stockanalysis.com).

## Cited instead of you (all display names, no listicle pollution)

Profound 189× · Semrush 87× · Otterly 80× · Peec AI 60× · HubSpot AEO 55× · Ahrefs 46× · SE Ranking 45×

## Deltas vs. the 2026-07-31 dogfood sweep (N=1)

| Metric | Dogfood | N=5 baseline | Read |
|---|---|---|---|
| Branded retrievability | 100% (N=8) | 98% (N=40) | one Gemini miss; effectively flat |
| Category win | 0% (N=33) | 0% (N=162) | **flat — now high-confidence**, the honest zero holds |
| Owned citation | 50% (N=8) | 54% (N=39) | +4pp; still ~half (Claude cites pigenai.com/aeoaudittool instead of own site) |
| Fidelity drifted | 1 (PIGENAI-LLC **false positive**) | **0** | **false positive fixed** ✓ |
| Top "cited instead" | `hubspot.com` 15× (bare domain, listicle) | **Profound** 189× (real rival, display name) | **listicle pollution gone** ✓ |

## Follow-ups surfaced (not blocking)

- **Gemini truncation still ~30% at cap 900** → the A1 block correctly hides its column. Tuning: raise `SWEEP_MAX_OUTPUT_TOKENS_GEMINI` (e.g. 1200) to recover Gemini's category signal.
- **ChatGPT fires web search inconsistently** (21 model-prior of ~50 category) → A2 correctly excludes them; worth the optional A2 search-forcing retry later.
- **Owned citation stuck ~54%** → the entity-collision remediation (unaffiliation line + @id graph) is the lever.
