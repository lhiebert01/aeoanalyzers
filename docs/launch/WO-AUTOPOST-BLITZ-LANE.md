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

## Everything you need is in the pack

`aeo-blitz-001-pack.zip`, delivered with this work order. Unzip it into the autopost repo
or read it in place — nothing in it needs to be fetched from aeo-app1.

```
aeo-blitz-001/
  campaign.json          the campaign: 6 stories x 6 passes = 36 scheduled posts,
                         each with a hook, the points it must make, and its image
  images/                14 files, one set per story, named by story slug
  images/MANIFEST.json   filename, live URL, byte size and sha256 for each
  README.md              how to run it, and why the order is that order
```

**Read `campaign.json` first.** It is the specification; this document is the rationale.
Where the two disagree, the JSON wins &mdash; it is what the code consumes.

Three fields in it decide whether this works:

- **`verified_facts`** is the COMPLETE set of figures available to this campaign. If a
  generated post wants a number that is not in there, it does not get a number. Not even
  labelled as an example. This is the grounded-output rule expressed as data rather than
  as an instruction someone has to remember at 08:30.
- **`hard_constraints`** are not style preferences. Each one is there because it was
  violated once and cost something.
- **`angles[].use`** entries that match a key in `verified_facts` must be stated in that
  fact's exact wording, not paraphrased into a stronger claim.

**Images: prefer `url` over the local file.** Two are queued for replacement and a URL
pull picks up the corrected version without another commit. `buyers-guide-hero.jpg` is a
known mismatch &mdash; it carries the headline &ldquo;AEO software explained&rdquo; rather
than &ldquo;The AEO Buyer&rsquo;s Guide&rdquo;. Use it and swap when the replacement lands.

Pass-one copy is written out in full in `BLITZ-DISTI-PACK-aeo-buyer-series` &mdash; use it
as the style exemplar for passes two to six rather than inventing a house voice.

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

Six stories, cycled in the `order` field of `campaign.json`. That order is deliberate: the
standard leads because it is the most linkable asset, the primer follows because it is the
widest-audience and least commercial piece, and the product-mechanics post goes last
because it is the only one that is about us.

| # | Story slug | URL | Image |
|---|---|---|---|
| 1 | `buyers-standard` | `/aeo-buyers-standard` | `buyers-standard-hero.jpg` |
| 2 | `primer` | `/blog/why-ai-doesnt-mention-you` | `primer-og.jpg` (+3 alternates) |
| 3 | `what-a-tool-should-do` | `/what-should-an-aeo-tool-do` | `what-a-tool-should-do-hero.jpg` |
| 4 | `best-aeo-tools` | `/best-aeo-tools` | `best-aeo-tools-hero.jpg` |
| 5 | `buyers-guide` | `/aeo-buyers-guide` | `buyers-guide-hero.jpg` |
| 6 | `how-it-works` | `/blog/how-it-works` | `how-it-works-og.png` |

**Four to six passes** = 24 to 36 lane-days, roughly five to seven weeks of weekdays.
Start at six; cut to four if engagement decays measurably rather than on a feeling.

The primer is the only story with three alternate images. Use a different one on later
passes so a repeat reader sees a different card.

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
