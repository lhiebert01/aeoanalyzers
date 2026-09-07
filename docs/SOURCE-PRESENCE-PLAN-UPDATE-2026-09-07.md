# Source Presence Program — where the plan is, and what changed. Sep 7 2026

**The plan exists and is good.** It is `WORK PLAN — Source Presence Program`
(WORK-PLAN-AEO-SOURCE-PRESENCE-001), filed at
`/mnt/c/Users/Linds/Downloads/WORKPLANAEOSOURCEPRESENCE001.md`, queued Sep 2 2026 as a future
program rather than a work order. Nothing in it has been executed. Section 3 is the Wave 1
program you are remembering: nine numbered actions from now to Nov 2, of which **3.3 Wikidata**
and **3.4 Directories** are the manual listing work.

**It is not in the repo**, which is part of why it went quiet. Recommend it moves to
`docs/launch/SOURCE-PRESENCE-WAVE-1.md` so it sits beside the measurement that scores it.

---

## 1 · The number that has not moved, and the number underneath it

| | Aug 1 anchor | Sep re-measure |
|---|---|---|
| Category citation win | 0% (N=200) | 0% (N=200) |
| **Our domain appearing in any cited source** | **0 of 200** | **0 of 200** |
| **The string "aeoanalyzers" anywhere in any answer** | **0 of 200** | **0 of 200** |

That second and third row are new to this note, and they matter more than the headline. A 0%
citation rate could mean the engines see us and rank us last. It does not. **We are not in the
corpus at all.** Not cited, not mentioned, not retrieved. There is nothing to rank.

This is the leading indicator the plan's own definition of done asks for — "how many of the
cited-instead sources now list us" — and today it is zero. It is also the cheapest thing to
track: it needs no new measurement, just this count each month.

## 2 · What actually changed since the plan was written (Sep 2)

**a. The Claude finding is worse than "the index lags."** Tested Sep 7: Claude cannot retrieve
our static, prerendered, JavaScript-free blog pages by a sentence that exists only on them, and
answers "what is aeoanalyzers.com?" from pigenai.com instead. The plan's line "Claude's search
index lacks the site" is confirmed and sharper — it is not a ranking problem, it is absence.
Detail in `docs/DISCOVERABILITY-FINDINGS-2026-09-07.md`.

**b. pigenai.com is currently answering for us, incorrectly.** It is the only PIGENAI property
in Claude's index, and it produced "as part of customized governance assessments," which is
false. Handover filed. **This raises 3.8 from a housekeeping item to the top of the list** — the
one indexed page that describes us is wrong, and fixing it is both the fidelity fix and our
cheapest inbound link.

**c. The competitor corpus is consolidating while we are absent.** From our own stored runs,
category sources only, Gemini's grounding redirect excluded:

| Source | Aug 1 | Sep | Read |
|---|---|---|---|
| tryprofound.com | 38 | **57** | the leading competitor is gaining ground as a *cited source*, not just a named tool |
| techradar.com | 37 | 45 | mainstream tech press is now a top-three source for this category |
| reddit.com | 59 | 40 | still large, but engines are leaning on it less |
| otterly.ai | — | 18 | a second competitor's own domain entered the corpus |
| g2.com | 18 | 17 | steady — and it is a plan target (3.4) |
| technologyadvice.com | — | 16 | steady — and it is a plan target (3.5) |
| dageno.ai · listablelabs.com · airops.com · seranking.com · nicklafferty.com | present | present | the independent-reviewer layer, stable enough to pitch |

**The competitors are winning by being cited as sources, not only by being listed.** That is a
different game from directory presence and it changes where the effort goes.

**d. We now have the tool to score the plan.** `scripts/exec-report-stored.ts` renders any
stored sweep at zero cost and supports a two-column comparison, so "is presence rising" is a
report, not a manual count.

## 3 · How the plan should change

**Keep the whole structure. Change the order, and add one measurement.**

### The reordering

| Plan item | Was | Should be | Why |
|---|---|---|---|
| 3.8 pigenai.com fix | with each publish | **first, this week** | It is the only indexed page describing us, and it is wrong. Also our cheapest inbound link. |
| 3.1 publish the gated batch (D1/D2/D3/about) | this week | **still first-equal** | Unchanged. Four pages built and unpublished since August is the largest unforced loss on the board. |
| 3.3 Wikidata | this week, 30 min | **this week, unchanged** | Cheapest fix for the acronym collision, and the anchor other sources resolve against. |
| 3.4 directories | Sep 8–19 | **Sep 8–19, but reprioritised by our own data** | Do G2, Capterra/GetApp, AlternativeTo, SaaSHub, Product Hunt, Crunchbase — and put **G2 first** because it is the only one of them our own sweep shows being cited (17× in September). |
| 3.5 listicle pitches | Sep 9 → Oct 31 | **raise to equal priority with 3.4** | This is where the movement is. TechRadar at 45 and TechnologyAdvice at 16 are cited far more than most directories. Add the September risers: dageno.ai, airops.com, listablelabs.com, seranking.com, nicklafferty.com. |
| 3.6 Reddit | ongoing | **keep, unchanged** | Still 40 citations. Genuine participation only. |
| 3.7 HN / podcasts | Oct | **keep** | The corroboration layer. |
| 3.9 monthly re-measure | Oct 1 · Nov 1 | **keep, and add the presence count** | See below. |

### The one addition — a leading indicator that moves before citation does

Category citation win will read 0% for months, and that tells you nothing about whether the work
is landing. Add **corpus presence** to the monthly measure:

> Of the source domains the engines cite for our category questions, how many now name
> aeoanalyzers.com? Count them. Today: **0 of 215 distinct domains.**

This moves the moment a directory or a listicle publishes, weeks before an engine starts citing
us. It is computable from data we already store. If corpus presence rises and citation stays at
zero, the problem is rank. If corpus presence stays at zero, the outreach is not landing, and no
amount of on-site work will help.

### One thing to stop doing

**Stop re-running the analyzer on our own site expecting the score to move.** You have run it
three, four, five times. The on-site score is already good and it is not the constraint — the
Aug 1 and Sep measures agree on 0% category, and our own domain appears in zero cited sources
either month. Nothing on our own pages changes that count. This is the plan's own thesis in
section 1: homepages do not win. The next on-site work that matters is **publishing the four
gated pages**, because they add citable comparison content, not because they raise a score.

## 4 · The honest answer to "how do we become the answer"

Three things have to be true, in order, and only the third is the goal.

1. **Be retrievable.** Claude cannot find us today. Fixed by inbound links from indexed
   domains — starting with pigenai.com — plus time. Nothing else we control moves this.
2. **Be in the corpus.** Be named on the pages engines already cite for this category. That is
   directories, listicles, reviewer blogs and Reddit. Zero of 215 today.
3. **Be recommended.** Only reachable after 2. This is the 0% we keep measuring.

We have spent the most effort on the layer that is already fine — our own site — and the least
on layer 2, which is the entire constraint. The plan already says this. The change is to act on
it and to measure layer 2 monthly so the work has a scoreboard before layer 3 moves.

**Realistic expectation:** the Nov 1 measure most likely still reads 0% category. Success at
Nov 1 is corpus presence above zero and Claude retrieving us at all. Category citation is a
Q1 outcome, and saying otherwise would be the kind of promise this product exists to disprove.
