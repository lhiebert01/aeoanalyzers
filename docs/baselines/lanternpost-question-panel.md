# Lantern Post — Pinned Citation-Sweep Question Panel

**Label:** LP BASELINE — Sep 2 2026
**Purpose:** the FIXED question set for the Lantern Post monthly re-measure. The sweep template
auto-regenerates questions each run (and mis-guessed the category as group/greeting-card the
first two times), which breaks month-over-month comparability. This is the frozen set: reuse it
**verbatim** on Sep 22 (the two-weeks-after-launch comparison) and every re-measure after, so
"did the number move?" is a real comparison and not question drift.

**Source of truth:** the stored baseline sweep row (below) — NOT the auto-guess, NOT prose. The
12 questions here were read back verbatim from `sweep_results`.

## Baseline sweep of record
- **Sweep id:** `c9d75643-936f-4dec-974a-0b7dcff3f334`
- **Run:** 2026-09-03 04:16 UTC (Sep 2 evening, America/Chicago) · **pre-launch** (Lantern Post wire Sep 8)
- **Reps per query:** 1 · **Total runs:** 48 · **Cost:** $0.4395
- **Engines:** Claude, ChatGPT (OpenAI), Perplexity, Gemini
- **Headline (CORRECTED, WO-AEO-SWEEP-INTEGRITY-002):** branded retrievability **6/8 = 75%** (N=8) · category citation win **0%** (N=24) · owned-citation **100%** (N=6) · category share **0%** (N=11).
  - Branded is **6/8, not 8/8**: Claude's two branded runs said *"the search results don't show a specific website … at lanternpost.app"* and cited only near-name collisions — scored "search ran, site not found" (a miss), not a false citation.
- **Competitor sets:** *entered* = Paperless Post / Jacquie Lawson / Hallmark eCards (cited-instead: Paperless Post 6× · Hallmark 4× · Jacquie 1×). *auto-detected* (what the engines actually surface for the category) = americangreetings, 123greetings, bluemountain, punchbowl, paperlesspost, canva, kisseo, greetingsisland.
- **Record of truth for Sep 22:** the **live-run download** (`citation-sweep-lanternpost.app-2026-09-03.md`, branded 100% pre-correction) is the interim record **until the reopened saved view reproduces this row field-for-field** (needs migration `20260903` applied + this row's config backfilled). The saved view now re-scores to the corrected 6/8; once the diff passes, the saved view is the record. The original live download is kept as labeled **pre-correction evidence**, not a competing number.

## Config (verify these three before any re-run)
- **Brand:** Lantern Post
- **Core category:** Free digital greeting cards (e-cards)
- **Competitor seed:** Paperless Post · Jacquie Lawson · Hallmark eCards

## The 12 questions

### About you (branded — retrievability)
1. who is lanternpost.app
2. what is lanternpost.app

### From prospective buyers (category / unbranded)
3. best free ecard sites without a subscription
4. free digital greeting cards you can send by text message
5. best app to send a birthday card with a song in it
6. how to send an online greeting card without a subscription or account
7. how to send someone a song as a musical greeting
8. how to send a digital card without giving the recipient's email address
9. free alternatives to Paperless Post for sending a single card
10. Jacquie Lawson alternatives that are free
11. Hallmark eCards alternative with no membership fee
12. digital greeting card that doesn't track the recipient

**Rules of use** (same as the aeoanalyzers panel)
- Do NOT edit questions to make Lantern Post win (tilting kills the number's credibility).
- Do NOT remove questions it loses (reverse cherry-picking makes the test easier).
- If a question must change, change it permanently AND note it here with the date, and treat
  that month as a new baseline (not comparable to prior months).

## Sep 22 procedure (until per-domain config memory ships — P1-B)
The UI re-guesses config on every sweep; there is no per-domain memory yet. So on Sep 22, do NOT
trust the auto-guess — paste from this pin, field by field:
1. Sweeps → enter `lanternpost.app` → on the confirm screen, overwrite:
   - Core category → **Free digital greeting cards (e-cards)**
   - Closest competitors → **Paperless Post / Jacquie Lawson / Hallmark eCards** (one per line)
   - Questions (View/edit) → paste the 10 category questions above (keep the 2 About-you); confirm the count reads **12**, no label lines.
2. Run. Store. Compare to `c9d75643-…` — same questions, same way.
