# WO-AEO-EXECREPORT-001 — Reviewer notes (from the Mazda dogfood, 2026-07-26)

Companion to `WO-AEO-EXECREPORT-001.md` and `mazda-sample.md` (the approved golden-master template). Three guardrails validated against a real 60-run Citation Sweep of `mazdausa.com`.

## 1. Crawler-0 = measurement gap, NEVER "AI ignores you" (blocklist rule for Phase 1.2)
`bot_hits` / crawler telemetry is only populated for **instrumented** sites (our edge middleware). A prospect who hasn't installed it shows `0` — that means *no data*, not *no crawls*. The generator must render an uninstrumented `0` as a **blind spot / measurement gap**, and must **never** assert "AI has never crawled your site." (An early hand-draft made exactly this fabrication; the approved sample reframes it as Finding 5 — "one thing we couldn't see, and you can't either.") Add this to the gray-hat/accuracy blocklist check on generated output.

## 2. Golden-master = the CLEAN 60-run Mazda sweep only
Acceptance test 1.3 regenerates from the archived Mazda sweep JSON. Archive the **clean** run:
- Domain `mazdausa.com`, brand `Mazda`; branded `who is {domain}` / `what is {domain}`; category `best compact SUV`, `best crossover SUV`, `most reliable small SUV` — **all three intact.** (An earlier run truncated the third into "most reliable small" + a bogus "│ │ SUV" from a pasted table-wrap; fixed in `SweepDashboard.tsx` `parseLines`, which now strips box-drawing chars and rejoins wrapped continuations.)
- Reference numbers the narrative must reproduce: branded **24/24 (100%)**; per-engine category **ChatGPT 100 / Gemini 100 / Claude 67 / Perplexity 67**; per-query **compact 12/12, crossover 8/12 (Perplexity 0/3, Claude 2/3), reliability 10/12 (Claude 1/3)**.
- Headline = **crossover / Perplexity-0 + "answered from stale 2023 third-party data, not mazdausa.com."** NOT a reliability-invisibility wound — that was a truncated-query artifact, and the clean data shows reliability at 83%.

## 3. Confirm the sweep emits per-COMPETITOR citation counts
Template slot `{competitor_citation_counts}` and the email line ("we logged every Toyota/Honda/Subaru citation") need a real data source. The authority-gap block emits per-*authority-domain* counts; confirm `run-sweep` also tallies the supplied competitor list specifically. The SanctumShield sweep surfaced "Knostic 8× / Netwrix 7×", so the capability exists — verify it binds to the named competitors (Toyota/Honda/Subaru), not only top authority domains, before the paid report promises it.
