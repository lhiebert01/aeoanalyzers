# Close-out — WO-AEO-SCHEMA-CLAIM-PRECISION-001

**Closed:** 23 September 2026 · **Commit:** `43eb08b` · **Deployment:** `dpl_5Aixd2D7p1qv26LjfHVBnku6s3y6` (production, main)

The LinkedIn wording and the page wording are now identical: *six of seven AI platforms show no sign of using your schema when choosing what to cite.*

## §5 acceptance

- [x] **Every §3 surface reported** — table below, before/after inline.
- [x] **External fetch of the primer** (not a local build): `HTTP/2 200`, `x-vercel-id: cle1::hqjlz-1790218829081-e4307f46a449`, `age: 0`. Corrected line present ×1, old line ("could read it at all") present ×0. Blog index: corrected ×1, old ×0.
- [x] **Commit + deployment:** `43eb08b` → `dpl_5Aixd2D7p1qv26LjfHVBnku6s3y6`.
- [x] **Lint committed with prove-by-breaking:** `schemaClaimViolations()` in `src/lib/voiceLint.ts`, test `src/__tests__/schemaClaim.test.ts`. Planted the old sentence in the primer → that file went red; removed → green. Tests **504 → 532**.
- [x] **Repo-wide grep = 0 hits** outside test fixtures and the lint source (which must name what it bans):
  ```
  grep -rn -i -E "(cannot read|can'?t read|can’t read|do(es)? not read|don'?t read|unable to read|invisible to|ignores?)[^.]{0,80}\b(schema|structured data|json-?ld)\b|\b(schema|structured data|json-?ld)\b[^.]{0,80}(cannot read|can'?t read|can’t read|do(es)? not read|don'?t read|unable to read|invisible to)" public/ src/ api/ scripts/ autopost-packs/ docs/launch/ | grep -v "__tests__\|src/lib/voiceLint.ts"
    0 hits
  ```
- [x] **Primer diff limited to the schema sentences** — `git diff` shows exactly two changed `<p>` lines; nothing else in the primer moved.

## §3 surfaces

| # | Surface | Result |
|---|---|---|
| 1 | `/blog/why-ai-doesnt-mention-you` | **Fixed.** Before: *"…found that only one of them — Google's Gemini — could read it at all."* After: *"…found that only one of them — Google's Gemini — showed any sign of using it. The crawlers fetch your HTML and the JSON-LD is in it; the evidence is that six of seven AI platforms show no sign of using your schema when choosing what to cite."* Second sentence — before: *"When it converts your page into something the model can read, it strips the schema out first."* After: *"ChatGPT is the clearest case: the same research found that when it converts your page into text for the model, the JSON-LD does not come through."* The schema-only-fact finding and the recommendation are unchanged. |
| 2 | Blog index excerpt | **Fixed.** *"six of seven AI platforms cannot read your schema"* → ratified wording. |
| 3 | Primer meta / OG / Twitter description | **Clean** — none mention schema (rewritten under the SERP-length pass earlier today). |
| 4 | `llms.txt` / `llms-full.txt` | **Clean** / does not exist. `llms.txt` describes schema as a deliverable only. |
| 5 | Other posts (`reading-isnt-citing`, all of `/blog/*`) | **Clean** — sentence-level scan of every public HTML file. |
| 6 | Landing page, `/pricing` | **Clean.** |
| 7 | In-product report text | **One fix** in `src/lib/crawlerAccess.ts` (robots-block recommendation). Before: *"These engines cannot read your page, so your schema and content are invisible to them."* After: *"These engines are blocked from fetching your page, so nothing on it — content or structured data — reaches them."* Subject is a blocked crawler and the claim was true, but the sentence paired a banned verb with "schema". DOCX export, Roadmap, Do-Now, Sweep report, AdvancedAnalysisCards: **clean**. |
| 8 | `scripts/exec-report-stored.ts` | **Clean.** |
| 9 | `/blog/seo-vs-aeo` draft | **Not present in the repo** — nothing to fix before it ships; the lint will catch it when it lands. |
| 10 | Queued teaser copy | **Fixed:** Pack 1 post 2 LinkedIn (*"→ six of seven AI platforms cannot read your schema"* → ratified) and X (*"6 of 7 platforms can't read your schema."* → *"6 of 7 platforms show no sign of using your schema to cite."*, two words trimmed elsewhere to hold 280). Autoposter `campaign.json`: `verified_facts.schema_read` and the story-angle hook (*"could not read the page's schema at all"* → ratified) plus a new hard constraint. Both packs regenerated (md + docx) and text-extracted clean. One historical hit remains in a work-order reference snapshot ("as received", not queued) — left as record. |

**Not touched, per §3:** the LinkedIn post and comment thread. **Not changed, per §6:** the schema recommendation, fix recipes; no sweep run.

**After deploy:** `npm run indexnow` → HTTP 200 (12 URLs).
