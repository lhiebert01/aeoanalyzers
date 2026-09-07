# Evidence note — an engine inventing a source, twice, and elaborating the second time

**Recorded:** Sep 7 2026 · **Status:** evidence, not yet published · **Destination:** Part 4, or an
addition to Part 3 — founder's call.

**Publication rule for this note: the third-party site is never named.** It did nothing. It is a
real publisher whose unrelated article was falsely credited with our sentence, and naming it in
published content would put a defamation-shaped claim on an innocent party for no reader benefit.
Same reasoning as the Part 3 no-naming ruling. In anything published it is "an unrelated site in
an adjacent topic area." The URL is kept here, in the repo, for verification only.

---

## What was asked

The question was deliberately narrow — a single sentence that exists on exactly one page on the
internet, our own:

> Which website published this sentence: "AI companies' crawlers had visited my site 265 times"
> in the thirty days to July 31? Name the site and the page.

The sentence appears in `/blog/i-scored-zero`. That page is static, prerendered, JavaScript-free
HTML, publicly reachable, and listed in our sitemap.

## What came back — call 1

**Engine:** Claude · **Model:** `claude-haiku-4-5` · **Web search:** invoked
**Fixture:** `docs/baselines/_fidelity-misattribution-2026-09-07.json` (verbatim)

The engine named an unrelated publisher and an unrelated article, and described the sentence as
referring to that publisher's own crawler measurements. Our site appeared in none of its eight
cited sources.

## What came back — call 2 (independent, same question)

The misattribution **reproduced**. It named the same unrelated publisher and article. It then
sharpened the invention:

| | Call 1 | Call 2 |
|---|---|---|
| Publisher and article | named, same both times | named, same both times |
| Attribution of the 265 figure | "Claude's crawler family" | **three specific agents named** |
| Publication date | not given | **a specific date asserted** |

So the elaboration is real but narrower than a first reading suggests: the crawler-family framing
was present in call 1, and call 2 added specificity — named agents and a date. All of it is
fabricated. Neither the number, the agent breakdown, nor that framing appears on the page it
credited.

*(Call 1 was captured truncated at 320 characters by the session harness, so the comparison above
covers only what was preserved. Call 2 is verbatim and complete in the fixture. Recorded rather
than smoothed over: an evidence note about an engine overstating its certainty should not
overstate its own.)*

## Ground truth, fetched

The credited page was retrieved and read on Sep 7 2026. It contains none of our text, no
reference to 265 visits in the thirty days to July 31, and no mention of AEO Analyzers,
aeoanalyzers.com or the founder. It is an unrelated report logging 604 AI-bot visits across 13
marketplaces over seven days in July 2026 — adjacent in topic, unconnected in substance.

**So no scraper is outranking the original.** This is not a syndication problem. The engine could
not find a page that exists, and rather than saying so, it manufactured a plausible source for it.

## Why this is the strongest fidelity artifact in the series

1. **The ground truth is unambiguous.** The credited page is public. Anyone can open it and
   confirm the sentence is not there. Most fidelity examples require trusting the subject's own
   account of themselves; this one does not.
2. **It reproduced.** A single odd answer is noise. The same fabrication on an independent call is
   a behaviour.
3. **It sharpened under re-asking.** The second answer named three specific agents and asserted a
   publication date the first did not give. Specificity rose while accuracy did not.
4. **It is the two layers in one artifact.** The retrievability failure (the page is not in the
   index) *caused* the fidelity failure (a fabricated attribution). That is the product's whole
   thesis — being read, being found and being described correctly are separate measurements — and
   here one visibly produces the other.
5. **It happened to us.** No customer's data, no permission needed, no third party's failing
   scores on display.

## The honest caveats, which belong in anything published

- **One engine, one model, one day.** Three other engines find the page. This is not a claim about
  AI in general, and it must not be written as one.
- **The engine did search.** It is not a case of a model answering from memory; the retrieval ran
  and returned nothing of ours.
- **A model that cannot find a page has no good options**, and declining to answer is the right
  one. The finding is that it did not decline, not that it failed to find us.
- **The unrelated publisher is a victim here, not a villain**, and the write-up should say so
  while keeping them anonymous.

## Draft angle, if it becomes its own piece

The Part 1 finding was *being read is not being cited*. This one is a step further: **not being
found is not being absent** — an engine that cannot retrieve you may still answer about you, and
what it says can be sourced to someone else entirely. For a business, the practical consequence
is that a visibility score of zero and a wrong answer are the same underlying problem seen from
two sides, and neither shows up in a rank tracker.

## Reproduction, for whoever writes it

```
Question: Which website published this sentence: "AI companies' crawlers had visited my site
265 times" in the thirty days to July 31? Name the site and the page.
Engine: Claude (claude-haiku-4-5), web search enabled.
Expected if the index gap has closed: aeoanalyzers.com/blog/i-scored-zero in the sources.
```

Re-run at each monthly re-measure and record the result in
`docs/DISCOVERABILITY-FINDINGS-2026-09-07.md` §6. The month this returns our own page is the
month the story gets its ending.
