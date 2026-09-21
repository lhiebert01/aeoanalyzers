# Autopost pack — `aeo-blitz-001`

Everything the autoposter needs for the AEO buyer-series blitz. Drop this folder into the
autopost repo, or read `campaign.json` from here.

```
campaign.json          the campaign — 6 stories x 6 passes = 36 scheduled posts
images/                every image, one per story, named by story slug
images/MANIFEST.json   file, live URL, byte size and sha256 for each
```

## How to use it

**One story per lane-day, in `order`.** Cycle 1 posts pass 1 of each story, cycle 2 posts
pass 2, and so on. Six passes over six stories is 36 lane-days, about seven weeks of
weekdays.

**Generate each post from its `angle`, not from a template.** Every angle gives a `hook`
(the opening line, use it close to verbatim) and a `use` list — the three or four points
that post should make. Anything in `use` that matches a key in `verified_facts` must be
stated using that fact's exact wording.

**`hard_constraints` are not style preferences.** Each one exists because it was violated
once and cost something. The two that bite most often:

- **No invented numbers.** `verified_facts` is the complete set of figures available. If a
  post wants a number that is not in there, the post does not get that number. Not even
  labelled as an example.
- **The URL goes in the body.** There is no comment API, so there is no other placement.
  Write copy that carries a link naturally rather than deferring it.

## Images

Prefer `url` over the local file. Two of these are queued for replacement and a URL pull
picks up the corrected version without another commit.

| Story | Image |
|---|---|
| buyers-standard | `buyers-standard-hero.jpg` |
| primer | `primer-og.jpg` — alternates: hero, fig2, fig3 |
| what-a-tool-should-do | `what-a-tool-should-do-hero.jpg` |
| best-aeo-tools | `best-aeo-tools-hero.jpg` |
| buyers-guide | `buyers-guide-hero.jpg` |
| how-it-works | `how-it-works-og.png` |

**The primer has three alternates** and it is the only story that does. Use a different
one on later passes so a repeat reader sees a different card.

**`buyers-guide-hero.jpg` is a known mismatch.** It carries the headline "AEO software
explained" rather than "The AEO Buyer's Guide" — right brand, right palette, on-topic,
wrong words. A replacement is being generated. Use it, and swap when the new file lands.

## Order, and why it is that order

1. **buyers-standard** — the asset, not the ad. Most linkable, most forwardable.
2. **primer** — widest audience, least commercial, strongest numbers.
3. **what-a-tool-should-do** — defines the vocabulary the rest of the series uses.
4. **best-aeo-tools** — the commercial page, lands better once the standard exists.
5. **buyers-guide** — the catch-all for anyone who missed the first four.
6. **how-it-works** — last, because it is the only one that is about us.
