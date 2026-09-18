# Fixture — the query that restates our own tagline, and we are not in the answer

**Date:** 2026-09-19 · **Status:** INTERNAL. Not published. Founder releases.
**Surface:** Google AI Overviews — **not one of our four measured surfaces.** Qualitative
evidence from an untested surface, labelled as such throughout.

---

## The headline finding

The query was:

> **"what is the best AEO app that gives the answer that AI will use"**

That is a near-verbatim restatement of our own tagline, **"Be the Answer AI Gives."**

**If we own any category question, it is that one. We are not in the answer at all.**

This is more diagnostic than the generic best-tools miss, because the query and our
positioning use the same words. A generic miss says we are not top-of-mind in a crowded
category. This says an engine, handed our own sentence, does not reach us.

It sits beside the measured position of record: category citation **0% at N=200**, and
`aeoanalyzers.com` in **0 of 200** cited-source sets, September 1–2 2026, four engines,
five repetitions.

## The vocabulary finding — measured, not inferred

Google flagged **"Missing: app"** twice on that query. Two hypotheses were proposed: buyers
use a vocabulary our corpus does not, or "app" is an unclaimed token. Measuring our own
served pages produced a third that neither anticipated.

Word counts in **visible text** of the served pages, 2026-09-19:

| Page | app | tool | platform | software | analyzer |
|---|---|---|---|---|---|
| `/` | 3 | 10 | 2 | **0** | 15 |
| `/pricing` | 0 | 3 | 0 | **0** | 7 |
| `/blog/i-scored-zero` | 1 | 10 | 0 | **0** | 9 |
| `/blog/what-you-actually-get` | 1 | 3 | 0 | **0** | 8 |
| `/blog/how-it-works` | 0 | 3 | 0 | **0** | 10 |

**"software" appears on the homepage exactly once, and only here:**

```
{"@type":"SoftwareApplication","@id":"https://aeoanalyzers.com/#app"...}
```

**Our category noun exists only in structured data.** In the seven-platform controlled test
only Gemini could retrieve JSON-LD at all, and a fact placed **only** in schema was answered
by no platform; ChatGPT strips JSON-LD before the model sees the page. So the word that
would anchor us to our own category is in the one place almost nothing reads.

All three "app" occurrences are prose about **customers'** applications — "build fast apps",
"if your app isn't semantically structured", "custom apps". We never use the word about
ourselves. Google's flag is literally correct.

**We are the worked example of our own flagship unquotable-facts check**, failing it on the
single most important token in our category.

**Not acted on yet**, per founder instruction. It is a brief input for the eventual
comparison page, not a copy change to make today.

## Why this fixture exists beyond its own content

It is the second reason — after `nosnippet` — that the product must be able to **state a
fact about Google AI Overviews with its scope labelled while scoring nothing on it.**
Founder ruling, 2026-09-19: *"Withholding a fact we can see is not the same discipline as
declining to advise on an engine we do not test."* The same resolution already applied to
Google-Extended: still audited, still reported, caps no score.

## For the D1 comparison-page brief, when it is built

The Overview's first sentence **rejects the premise of the query**: no AEO app can force AI
to use your answer. That is the model's prior about the entire category, and **we agree with
it** — "no tool forces an engine to do anything" is already a standing truth rule here.

So the page leads with what cannot be promised, then with what can actually be measured and
changed, then with how you verify it worked. **A ranking with us at the top would be arguing
against the answer the engine already gives.** Agreeing with it and then being useful is the
only version that survives someone checking.

## Panel change proposed for the October 1 run — flagged as new, not backfilled

Our panel is built around best-tools and category shapes. This is an **intent** shape: "the
tool that gives me the answer AI will use." It is the highest-intent version of our category
question and the panel has nothing like it.

Two candidate wordings:

- **A (recommended):** `best tool to become the answer AI gives for my category`
- **B (verbatim):** `what is the best AEO app that gives the answer that AI will use`

**A is recommended.** It contains a candidate request ("best tool"), so our own answer-shape
classifier reads it as recommendation-shaped and a zero against it is a real citation loss
rather than an advice-shaped non-result. B is the literal query a real person typed, which
has its own value, but "app" is a token we do not own and the question then measures
vocabulary as much as position.

**Panel v1.2, flagged NEW, applied from Oct 1 forward and never backfilled**, so the series
comparison against the Aug 1 anchor and the Sep 1 run stays honest. Per the pinned-panel
rules: a question that changes is disclosed, versioned and dated, and the month it changes is
a new baseline for that question only.

## Open, and deliberately not merged with anything else

This is Google AI Overviews. Our Brave finding is about Claude. Our category zero is about
all four measured engines. **Three different systems, three different causes.** They are not
one explanation and this fixture does not treat them as one.
