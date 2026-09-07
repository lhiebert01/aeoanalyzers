# Crawler-figure audit — every published and draft number, against its real measurement window

**Sep 7 2026 · gating item: nothing immutable ships until this is resolved.**

---

## 1 · What the data actually says

Queried directly from `bot_hits` for aeoanalyzers.com, Sep 7 2026.

| Fact | Value |
|---|---|
| First row ever recorded | **2026-07-22T14:57 UTC** |
| Migration that created the table | `20260722_wo3_bot_hits.sql` — the instrument did not exist before Jul 22 |
| Rows in the claimed window "the thirty days to July 31" | **271**, of which **every single one** falls on Jul 22–31 |
| Distinct days with data in that window | **9** |
| Tier split in that window | 211 training · 38 search · 22 live |
| GPTBot in that window | **179** |
| Rows Aug 19 – Sep 7 (the broken window) | **14 across 5 days** — missing data, not a decline |

## 2 · The verdict on the published number

**The counts are right. The window is wrong.**

- 211 training-tier and 179 GPTBot match the published figures **exactly**. The 265 total is
  within six of today's 271, consistent with the count having been taken on Jul 31 before a few
  late rows landed. The number was honestly derived from real rows.
- **"In the thirty days to July 31" is not true.** There was no telemetry before Jul 22. The
  observation window was **ten calendar days, nine of them with data.**

**The direction of the error is conservative, which is worth saying plainly.** 265 crawls in ten
days is a *higher* intensity than 265 in thirty — roughly 27 a day rather than 9. We understated
the rate while overstating the duration. Nobody was misled into thinking we were crawled more
than we were. That does not make it correct, and for a company whose entire position is
measurement honesty, a stated window that did not exist is exactly the error we cannot make.

**It also makes the story better.** "The engines read my site 265 times in ten days and cited it
zero" is a stronger sentence than the one we published.

## 3 · Every surface carrying the figure

**Drafts — correctable, corrected today**

| Surface | Where | Action |
|---|---|---|
| EIN wire release | `docs/launch/pr/EIN-release-FINAL-2026-10-14.md` body + subhead | ✅ corrected to the true window |
| EIN launch plan | `docs/launch/EIN-LAUNCH-PLAN-AEO-ANALYZERS.md` numbers table, angle, subhead | ✅ corrected |
| Outreach copy kit | `docs/outreach/AEO-OUTREACH-COPY-KIT.md` day-7 email | ✅ corrected |
| Homepage stat draft | `docs/drafts/homepage-stat-enrichment-DRAFT.md` | already warns against evergreen use — no change |
| How-it-works draft | `docs/drafts/how-it-works-blog-DRAFT.md` | ✅ corrected |

**Published — needs your decision**

| Surface | What it says | Note |
|---|---|---|
| `/blog/reading-isnt-citing` | **The figure is the title, the slug, the H1, the OG card, the Twitter card and the JSON-LD headline.** Body says "in the thirty days to July 31" in five places | The count stays valid; only the window is wrong. Title and slug need not change. |
| `/blog/i-scored-zero` | one body sentence | |
| `/blog/how-it-works` | one body sentence | |
| `/blog/` index | card description | |
| `public/llms.txt` | one line | |
| Launch kit + both POSSE packs | many, incl. syndicated copies already posted elsewhere | Frozen copies off-site cannot be edited |

## 4 · Recommendation on the published pages

**Correct the window in body text; leave titles, slugs and the count alone.** Replace "in the
thirty days to July 31" with **"in the ten days to July 31"** wherever it appears. The number,
the headline, the OG cards and the URLs are unaffected, so nothing breaks and no link dies.

**Add a dated correction note** to `/blog/reading-isnt-citing` only, since it is the post built on
the figure:

> **Correction, September 7 2026.** This post originally described the 265 crawler visits as
> occurring "in the thirty days to July 31." The telemetry that produced them began on July 22,
> so the true observation window is ten days, not thirty. The count and the tier breakdown are
> unchanged. The corrected figure is a higher crawl rate than the one first published, not a
> lower one.

**Why a note rather than a silent edit.** The post has been syndicated; frozen copies elsewhere
still carry the original wording, and a reader comparing them should find the discrepancy
explained rather than hidden. A measurement company that quietly edits a published measurement
has spent the thing it sells.

**Do not** restate the crawler figure in the September post, per your ruling. Its window overlaps
the broken period.

## 5 · The rule this leaves behind

Every published figure needs three things recorded beside it, and this one had only the first:

1. the value,
2. **the window it was measured over**, and
3. **the date the instrument that produced it started and last recorded.**

Point 3 is new and it is the one that failed here. An instrument's start date bounds every window
you can honestly claim, and a write-only instrument with no read-back cannot tell you when it
stopped. Both halves of that failed in the same month.
