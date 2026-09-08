# A three-engine panel overstates AI recommendation by about 14 points

**Measured Sep 7 2026 · written Sep 8 · not yet published.**

This is a finding about **how AI-visibility is measured**, not about the seven companies it was
measured on. It came out of an accident: a sweep ran with a dead engine, was re-run complete, and
the two results were compared.

---

## The accident that produced it

On September 7 a batch of seven measurements ran with the Claude adapter failing on every call —
an expired API balance. Each failure was correctly excluded rather than scored as zero, so the
results were internally valid: a clean three-engine measurement of ChatGPT, Perplexity and Gemini.

The balance was topped up and **the whole batch was re-run on the same day across four engines**,
rather than adding Claude to the existing data. The reason was measurement hygiene: backfilling one
engine on a later date would have left any change ambiguous between the added engine and the
different day.

That decision is what makes the comparison below possible.

## Separating the two effects

The three-engine and four-engine figures come from **the same run, on the same date, with the same
questions**. The only difference is whether Claude's answers are included. A second comparison —
the original three-engine run against the same three engines in the re-run — measures ordinary
run-to-run variation.

| Target | Original 3-engine | Same 3 engines, re-run | All 4 engines | Claude alone |
|---|---|---|---|---|
| S1 | 100% | 100% | **53%** | 7% |
| S2 | 59% | 58% | **36%** | 0% |
| S3 | 26% | 26% | **18%** | 7% |
| S4 | 17% | 0% | **3%** | 7% |
| S5 | 26% | 30% | **18%** | 0% |
| S6 | 97% | 93% | **87%** | 73% |
| S7 | 0% | 12% | **6%** | 0% |

| Effect | Mean change |
|---|---|
| **Run-to-run drift**, same three engines, different run | **−0.9 points** |
| **Panel effect**, adding a fourth engine to the same run | **−14.0 points** |

The panel effect is roughly fifteen times the size of run-to-run noise, and it moved **every one of
the seven targets**, six of them downward.

## The mechanism, and the explanation it rules out

The obvious explanation is that Claude simply answered from memory more often, and unsearched
answers are excluded from scoring. **That is not what happened.**

| | Search-grounded rate |
|---|---|
| All engines, category runs | 248 of 420 — **59%** |
| Claude only | 105 of 105 — **100%** |

**Claude ran a live web search on every single category question** and still named these brands far
less often than the other three engines did. It is not answering from memory. It searched, and
recommended something else.

## What this does and does not support

**Supported.** On this panel, on this date, adding Claude lowered measured category recommendation
substantially and consistently, and the effect dwarfs run-to-run variation. **A visibility score is
a property of the engine panel as much as of the brand.** Any vendor reporting a single composite
number without naming its panel is reporting something that cannot be compared with anyone else's.

**Not supported, and worth stating plainly.**

- **Seven companies, one date, one category question set each.** This is a signal, not a law.
- **Not a controlled experiment.** Nothing was randomised and no other engine was swapped in or out.
  A four-engine panel that added a different fourth engine might move the number the other way.
- **"Claude is stricter" is one reading and not the only one.** The alternative is that Claude's
  search index has thinner coverage of these companies, so it searched and found less to cite.
  We have direct evidence that its index coverage can be sparse: this company's own domain,
  aeoanalyzers.com, is absent from Claude's index entirely while three other engines retrieve it.
  Thin retrieval and strict recommendation produce the same number and this data cannot separate
  them.
- **Claude contributes a quarter of the runs**, so its per-engine rates rest on smaller counts than
  the panel figures.

## Why it belongs in the honest-zero series

It is the same shape as publishing our own zero. It is a methodological disclosure that makes our
own numbers look *worse* and harder to compare favourably, and it is the kind of thing a vendor has
every incentive not to mention. It also arms a buyer with the right question to ask any vendor in
this category, including us: **which engines are in your panel, and what happens to my score if you
add one?**

It carries a practical consequence too. Two of the seven three-engine findings would have produced
a false claim in an email. One target read as a category winner with nothing to say and is actually
at 53%. Another read as a clean zero — the strongest finding of the batch — and is actually at 6%.
In outreach whose entire argument is that every number is defensible and every transcript
reproducible, sending either would have been the worst possible error.

## Reproducing it

Both datasets are retained: the three-engine run in `private/baselines/_3engine-run-…-INCOMPLETE/`
and the four-engine run beside it. Every figure above is recomputed from stored transcripts, and
the per-engine subsets are derived by filtering those same runs rather than by re-measuring.
