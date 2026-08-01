# SERIES ANCHOR — Aug 1 2026 · refined question set · N=5

**This is the comparator of record for the monthly honest-zero series** (POLISH-002 C7).
Run with the pinned 12-question panel (`aeoanalyzers-question-panel.md`) at reps=5 via
`scripts/headless-sweep.ts` (same adapters + scoring as production). NOT the reps=1
Aug-1 validation run; NOT the Jul-31 launch baseline (which used a different
auto-generated set — it stays the launch-narrative number, not the series comparator).

- **Domain:** aeoanalyzers.com · **Brand:** AEO Analyzers
- **Reps:** 5 · **Runs:** 240 (2 branded + 10 category × 5 × 4 engines) · **Engine cost:** ≈ $2.81
- **Competitor seed:** Profound (tryprofound.com), Otterly AI (otterly.ai)
- **Raw JSON (all 240 transcripts):** `aeoanalyzers-SERIES-ANCHOR-2026-08-01.json`

## Headline

| Layer | Result | N | Confidence |
|---|---|---|---|
| Branded retrievability | **100%** | 40 | high |
| Category recommendation win | **0%** | 200 (grounded) | high |
| Model-prior (no-search) category answers excluded | 0 | — | — |

Per engine (branded / category-win): Claude 100% / 0% · ChatGPT 100% / 0% · Perplexity 100% / 0% · Gemini 100% / 0%.

## B6 validation (Gemini output cap 900 → 2048)

- **Gemini truncations this run: 0** (was ~2 per run at cap 900). Total truncations across all four engines: **0.** The A1 exclusion/badging net stays regardless.

## Read

- The honest zero holds at full N=5: engines find AEO Analyzers by name every time (100%) and recommend it to unbranded buyers 0% of the time — the readiness-leads-outcome gap, unchanged and reproducible.
- Notably, all four engines ran live web search this round (0 model-prior), so the 0% is a fully search-grounded result.
- **Panel note (flagged, not silently changed):** pinned Q8 still contains the defunct name "SearchGPT". It was run verbatim to keep the instrument fixed. Recommend bumping the panel to v1.1 with the A2c lint applied ("SearchGPT" → "ChatGPT search") BEFORE the Sept 1 run, and treating that as the pinned set from Sept 1 onward.

## Next series point: Sept 1 2026 — same panel, reps=5, same way.
