# Executive report — 21 September 2026

**Session output:** 25 commits, 439 tests green, 16 URLs in the sitemap, four new
published pages, one distribution campaign packed and ready to hand over.

---

## 1 · What changed today, in order of consequence

### The tier wall had three holes and all three are closed

QA found paid content reaching free accounts by three separate routes. Each was found by
looking at a different artifact, and the third was invisible to the first two checks.

| Leak | Found by | Status |
|---|---|---|
| Advanced-card fixes in the `llm-generate` response | reading the response body | closed |
| `full_result` shipped for 20 past runs on the History tab | reading the list query | closed |
| The browser rebuilding paste-ready JSON-LD after the server stripped it | **reading the stored database row** | closed |

That third one is the one worth remembering. Every gate we reasoned about guarded
something the *server* sends. The leak was in something the *client* makes for itself,
seconds later, and no server-side control could ever have reached it. It was found
because the QA step looked at stored state rather than at a response.

**19 historical rows** carrying fix content for non-entitled users were scrubbed, verified
to zero by searching for the content rather than for a null.

### Four new pages, published and indexed

A three-part buyer series plus a short-read entry point. Written so the **standard comes
before the comparison** — publishing the comparison first and then inventing criteria that
happen to favour us would not survive scrutiny.

| Page | Words | Role |
|---|---|---|
| `/aeo-buyers-standard` | 1,890 | Seven requirements, thirteen questions. Names no vendor, ranks nothing, **scores us against all seven including where we come off worst.** |
| `/best-aeo-tools` | 3,806 | Eight tools compared against that standard. Every competitor fact dated and linked to that vendor's own page. No winner named. |
| `/what-should-an-aeo-tool-do` | 1,316 | The vocabulary the rest of the series uses. |
| `/aeo-buyers-guide` | 928 | Three two-minute reads routing into all three. |

All four carry real OG cards, in-body heroes with alt text, Article + FAQPage schema
generated from the page text and proven verbatim, and cross-links to one another.

### Indexing fixed on both engines

Google was reading a sitemap last touched in June that declared 6 URLs; it now reads 16.
A malformed second sitemap entry was erroring since June and is gone. Bing was reading a
stale `www` sitemap with 6 URLs; removed. All buyer-series URLs submitted to both.

### Dogfooding found two faults in our own new pages

Before asking engines to cite them, we ran our own checks over them.

- **`/best-aeo-tools` was spending its extractor window on competitors.** The first ~200
  characters after the h1 is the only body text an instant-mode answer reads, and ours
  opened by naming seven rivals. Rewritten.
- **Three of four pages had zero entity-anchored sentences.** Not one began "AEO
  Analyzers" — exactly what our own Passage Extractability check tells customers to fix.

Both found by running the product's own logic over our own artifacts rather than assuming
the people who wrote the checks would comply with them. They did not.

---

## 2 · The measurement of record

From the 21 September sweep: 4 questions × 4 engines × 3 runs, 48 stored transcripts.

| | |
|---|---|
| Branded retrievability | **100%**, N=23, all four engines |
| Category citation win | **0%**, N=21 |
| Owned citation rate | 65%, N=23 |
| Fidelity | 22 of 23 accurate; 1 drifted |

**The finding that matters is not the zero.** Reading what the engines *cited* rather than
whether they cited us: every category answer, on every engine, was assembled from "best
tools" roundup pages. Not one came from a vendor's own product page. And a large share of
those roundups were written **by vendors in this category**, who published the comparison
and became the authority for it.

That is why `/best-aeo-tools` exists, and it is a testable claim: if the mechanism is
real, the October sweep should move.

Corroborated independently: Bing AI Performance reports **0 citations** over three months,
and Google's Generative AI report shows 20 impressions, homepage only.

---

## 3 · Asset inventory

**Published — 16 URLs in the sitemap**, of which 10 are content: four buyer-series pages,
six blog posts.

**Images — 14 files** in `autopost-packs/aeo-blitz-001/images/`, one set per story,
exact-size, opaque RGB, measured AAA contrast. Eight wired live.

**Distribution**
- `AUTOPOSTER-HANDOFF-aeo-blitz-001.zip` — work order, disti pack, campaign.json, images
- `campaign.json` — 6 stories × 6 passes = **36 scheduled posts**, each with hook, points and image
- Pass-one copy written in full for LinkedIn and X, all six stories

**Documentation**
- `docs/brand/` — image prompts, both sets, `.md` and `.docx`, twelve standalone prompts
- `docs/baselines/aeoanalyzers-2026-09-21-findings.md` — the sweep and the mechanism
- `private/_archive/` — 32 MB of rejected generations with reasons, gitignored

**Guards** — 439 tests. New today: tier-wall redaction, History leak, series interlinking,
OG images must exist on disk, hub cards may not contradict page titles.

---

## 4 · Your next steps

**Today, 15 minutes**

1. **Re-request indexing** on the four buyer-series URLs. Content grew 60–160% since this
   morning's requests. GSC and Bing.
2. **Hand the zip to the autoposter session.** Nothing in it needs anything from this repo.

**This week, about an hour**

3. **Generate the Buyer's Guide hero + OG.** That page is borrowing the "AEO software
   explained" pair — right brand, wrong words. Prompt is in `AEO-IMAGE-FIXES\README-FIXES.md`.
4. **Fix the `best-aeo-tools` hero artifact** — stray mark above "count." Same folder.
5. **Wikidata organisation item** (30–40 min) and **LinkedIn company page** (20 min).
   Neither moves the category number; both move accuracy.
6. **Run the blitz** — six posts, order in the disti pack, all six can go the same day.

**Ongoing — the only lever with direct evidence**

7. **Pitch the five domains the engines actually returned**, in order: techradar,
   searchenginejournal, dageno.ai, trysight.ai, analyticsinsight.net. Log each date so
   October is readable against it.

**1 October**

8. **Re-sweep.** Same twelve questions, same method. That is what makes this a measurement
   instead of a story.

---

## 5 · Autoposter next steps and trigger date

**Owner:** the Claude Code session on `/mnt/c/src/pigenai-autopost`. Everything it needs
is in the handoff zip.

| Step | |
|---|---|
| 1 | Read `campaign.json` — it is the specification; the WO is the rationale |
| 2 | Build the BLITZ lane as a fourth, reusable lane. Idle by default. Do not touch the existing three or the slack slots |
| 3 | Take 08:30 CT if free, else 08:45 / 09:00 / 09:30. Verify against `cadence_v3.json` rather than assume |
| 4 | Extend `test_swimlanes.py`: weekdays only, no collision with Slot A/B/C, never consumes a slack slot |
| 5 | Rotation state survives restart |
| 6 | **Dry run prints all 24–36 days** — post, pass, angle — for a human to read end to end |
| 7 | Founder reads the dry run and gives the go-word |
| 8 | First live post |

### Trigger date

**Recommended first live post: Monday 28 September 2026, 08:30 CT.**

The reasoning, so you can overrule it knowingly:

- **The manual blitz goes first**, this week. Six posts, your own account, your own voice.
  The lane is the *heartbeat behind* that push, not a substitute for it.
- **One week of build and dry-run** is enough for a new lane and not so much that the
  content goes stale.
- **A Monday start** puts pass 1 of the standard — the strongest asset — into the week's
  highest-attention slot.
- **28 September lands three days before the 1 October re-sweep**, so the sweep measures a
  period that is almost entirely pre-lane. That gives October a clean baseline and makes
  the *November* number the first honest read on whether the lane did anything.

**Hard gate:** no live post until you have read the dry-run schedule. Six passes over six
URLs is 36 posts under your name, and the one thing worse than not running it is running
it with a generated number nobody checked.
