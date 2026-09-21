# WORK ORDER — the BLITZ swim lane

**For:** the Claude Code session that owns `/mnt/c/src/pigenai-autopost`
**Raised:** 2026-09-21 · **Origin:** founder, after the six-post AEO blitz
**Status:** ready to build. Nothing here blocks on aeo-app1.

---

## Objective

Stand up a **fourth, reusable swim lane — the BLITZ lane** — for campaign initiatives
that need a sustained voice rather than a single post: claiming a category, publishing a
standard, defending a position.

**This is a lane, not a campaign.** The existing three lanes carry the portfolio on a
steady drumbeat, and they are the wrong instrument for a push like this — a campaign
needs consecutive weekday mornings and repeated passes over the same small set of URLs,
which a 15-day portfolio grid cannot give without starving everything else.

The BLITZ lane runs one campaign at a time, empties, and waits for the next one.

**Campaign 001 is the AEO buyer series**, defined below. When it finishes, the lane stays
and the next initiative loads into it.

### What qualifies as a blitz campaign

- A defined body of published work, usually four to eight URLs, already live.
- An objective beyond impressions — own a phrase, set a purchasing standard, establish a
  position before a competitor does.
- A finite run. A campaign that never ends is a lane that is never free.

If it does not meet all three, it belongs in the normal grid.

---

## The slot

**Weekdays only, Monday to Friday. One post per lane-day.**

Preferred time, in order — take the first that is free in `cadence_v3.json`:

1. **08:30 CT** (13:30 UTC)
2. 08:45 CT (13:45 UTC)
3. 09:00 CT (14:00 UTC)
4. 09:30 CT (14:30 UTC)

Existing Slot A is 08:00 CT, so 08:30 should be clear — **verify rather than assume**, and
record in the commit which time was taken and why.

This is a **fourth lane, not a reassignment.** Do not consume the six unassigned slack
slots reserved for waves and yields, and do not move anything in the existing grid.

The lane is **idle by default.** With no campaign loaded it posts nothing — it does not
fall through to generated content, and it does not borrow from another lane's bank.

---

## Campaign 001 — the AEO buyer series

Six posts, cycled in this order. It is the blitz order and it is deliberate — the
standard leads because it is the most linkable asset, and the product mechanics come last
because that post is the only one about us.

| # | URL | Image |
|---|---|---|
| 1 | `https://aeoanalyzers.com/aeo-buyers-standard` | `aeo-buyers-standard-hero-1600x900.jpg` |
| 2 | `https://aeoanalyzers.com/blog/why-ai-doesnt-mention-you` | `primer-og-1200x630.jpg` |
| 3 | `https://aeoanalyzers.com/what-should-an-aeo-tool-do` | `what-should-an-aeo-tool-do-hero-1600x900.jpg` |
| 4 | `https://aeoanalyzers.com/best-aeo-tools` | `best-aeo-tools-hero-1600x900.jpg` |
| 5 | `https://aeoanalyzers.com/aeo-buyers-guide` | `aeo-buyers-guide-hero-1600x900.jpg` |
| 6 | `https://aeoanalyzers.com/blog/how-it-works` | `og-blog-how-it-works.png` |

Heroes live at `aeoanalyzers.com/img/buyer-series/` and the two older posts use their
existing OG assets. **Pull them by URL rather than copying into `gbp-assets/`** so a
corrected image propagates without a second commit — two of these are already queued for
replacement.

**Four to six passes** = 24 to 36 lane-days ≈ 5 to 7 weeks of weekdays. Start at six
passes; cut to four if engagement decays measurably rather than on a feeling.

---

## Angle rotation — the part that decides whether this works

**Do not repost the same copy six times.** The blitz copy is pass one. Each later pass
needs a different angle on the same URL, which is the ×6 effective-frequency rule already
standing in this system.

Six angles per post, one per pass. For the Buyer's Standard, for example: the standard
itself → the receipts line → the thirteen questions → where we score worst → the
procurement-meeting use → apply it to us.

Seed copy for pass one is in
`aeo-app1/docs/launch/BLITZ-DISTI-PACK-aeo-buyer-series.md`. Passes two to six are yours
to generate, subject to the linter and the standing bans below.

---

## Standing rules that apply

These are not new; they are the ones this content trips most often.

- **Every post carries its link in the body.** The autoposter has no comment API, so
  this is a constraint of the system rather than a preference &mdash; there is no other
  placement available to it. Generated copy must therefore be written to carry a URL in
  the body naturally, not to defer it.
- **No cost or expense figure**, ever, on any customer-facing surface.
- **No invented numbers.** Only figures reproducible from a stored transcript or a
  published study. Not even as a labelled example.
- **Never** "other tools only give you a score" or "no other AEO tool measures whether AI
  is telling the truth about you". Both retired, both indefensible.
- **Do not name any individual** in connection with the entity-misattribution finding.
- **Do not publish any prospect's measured numbers.** Those are outreach material, not
  marketing material.
- Respect the existing floor: no app twice in a day, ≥3-day minimum gap including cycle
  wrap, skipped slots never backfilled.

---

## Acceptance

1. `cadence_v3.json` carries the new lane with the time actually taken recorded in
   `_doc`, and the existing 15-day grid is unchanged.
2. `test_swimlanes.py` extended: the new lane fires weekdays only, never collides with
   Slot A/B/C, and never consumes a slack slot.
3. A rotation-state file tracks which post and which pass is next, surviving restart.
4. A dry run prints the full 24–36 day schedule with post, pass number and angle for
   each, and a human can read it end to end before anything posts.
5. The linter passes on every generated variant — especially the banned-claims check.
6. First live post only after the founder has read the dry-run schedule.

---

## Loading the next campaign

When 001 finishes the lane must be reloadable without code changes. A campaign is a small
config object: a list of URLs with their images, a pass count, and an angle list per URL.
Adding campaign 002 should be a data change and a founder go-word, nothing more.

Log each completed campaign with its dates, pass count and the URLs it carried, so a
later sweep can ask whether the blitz moved anything.

---

## Explicitly out of scope

Do not touch the three existing lanes, the Tier 1/2/3 grid, the Context Floor rotation, the LP queue or the
checkride107 findings bank. This is an additive lane and nothing else moves.
