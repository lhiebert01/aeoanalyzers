# Citation Sweep — aeoanalyzers.com — 2026-09-21

**Run by:** founder, admin account, production UI · **Deployment:** `dpl_Awpz4b6dgBqy2WtqvGijuSCjGJPD` (`c177cbb`)
**Disclosure:** this is a SUBSET run (4 of the 12 pinned questions), taken 20 days after the
Sept-1 series date. It is **not** the September series measurement and must not be compared
cell-for-cell with the Aug-1 anchor. It was run to prove the paid sweep path end to end; the
findings below are a by-product, and they are the most useful thing in it.

---

## Configuration

| | |
|---|---|
| Brand / category | AEO Analyzers · Answer Engine Optimization software |
| Competitors (ratified seed) | Profound (tryprofound.com) · Otterly AI (otterly.ai) · Peec AI (peec.ai) |
| Questions | Q1, Q2, Q3, Q6 of pinned panel v1.1, verbatim |
| Engines | ChatGPT · Claude · Perplexity · Gemini, web search on |
| Design | 4 questions × 4 engines × 3 reps = 48 answers, all stored |

## Results

| Measure | Value | N |
|---|---|---|
| Branded retrievability | **100%** | 23 |
| Category citation win | **0%** | 21 |
| Owned citation rate | 65% | 23 |
| Category share vs. seeded competitors | 0% | 27 |

Per engine, branded: Claude 6/6 · ChatGPT 6/6 · Perplexity 5/5 · Gemini 6/6.
Per engine, category: 0% on all four.

**Excluded, not scored as zeros:** 1 Perplexity run errored; 3 ChatGPT answers were
model-prior (no live search) and are reported separately — the model named us in 0 of 3.

**Cited instead:** Profound 10× · Peec AI 9× · Otterly AI 8×.

## Fidelity

22 of 23 answers that named us got the facts right. One drifted: Gemini attributed the
product to **"Vincenzo Barbagallo"**.

That name traces to **`aeoanalyzer.it`**, which appears in the same run's collision list. The
misattribution is not random — it is the namespace collision producing exactly the failure
the collision detector predicts. Collisions observed: `aeoanalytics.com`, `aeoanalyzer.it`,
`aeo-analytic.com`, `aeograder.org`, Wikipedia entries for AEA Investors / AER / Aeon /
AEA ribbon mics, and two stock-ticker pages (marketwatch, seekingalpha) for the AEO ticker.

## What changed since the Sep-17 facts file

That file records **Claude branded 3/10**, with: *"the domain is not in Claude's search index;
Claude-SearchBot has never hit the site."*

This run: **Claude 6/6**, and the 30-day crawler table shows **Claude-SearchBot: 2 hits**.
Small N and a different question set, so this is a signal, not a settled number — but it is
the first evidence of Brave-index presence, which was the named blocker.

---

## THE FINDING THAT MATTERS

Read the 48 transcripts for **what the engines cited**, not whether they cited us.

Every category answer, on every engine, was assembled from **"best X tools" roundup pages**.
Not from vendor product pages. Not from documentation. Roundups.

The cited set includes: techradar.com (11×), searchenginejournal.com (9×), dageno.ai (8×),
trysight.ai (8×), analyticsinsight.net (8×), seranking.com (7×), semrush.com (7×), frase.io,
zapier.com, visible.seranking.com, answersocrates.com, get-ryze.ai, llmpulse.ai, elmohq.com,
vryse.co, lemrank.com, pikaseo.com, rankability.com, evertune.ai, usegrowthos.com,
seoptimer.com, onelittleweb.com, explodingtopics.com, overthinkgroup.com, llmrefs.com,
aiclicks.io, softwareadvice.com — plus wire/press pages on courier-journal.com,
beaconjournal.com, bignewsnetwork.com and tribuneindia.com.

**Two observations follow, and both are actionable.**

**1. The engines do not evaluate products. They summarise comparisons.** A vendor is named
in a category answer because a roundup named it. Nothing on the vendor's own domain puts it
in that answer.

**2. A large share of the cited roundups were published BY VENDORS IN THIS CATEGORY.**
frase.io, seranking.com, semrush.com, dageno.ai, llmpulse.ai, elmohq.com, vryse.co,
surferseo.com, evertune.ai, usegrowthos.com, rankability.com, aiclicks.io, llmrefs.com,
getairefs.com and seoptimer.com are competitors or adjacent tools that wrote the comparison
page — and are now cited as the authority for the category, including for questions about
their own competitors.

That is the mechanism. It is not a trick and it is not parasite SEO: the page is canonical on
their own domain, it is a real comparison, and it earns the citation because it is the page
shape the question calls for.

---

## What this says to do — three legs, in evidence order

**Leg 1 — publish the page type that gets cited.** `/best-aeo-tools`, canonical on
aeoanalyzers.com, a disclosed vendor comparison that names Profound, Otterly, Peec and the
rest honestly, with an as-of date and sourced claims. This is D1 of WO-CITATION-WIN-001,
specified and never built. The sweep now supplies the evidence for why it is the keystone:
**100% of the category answers in this run were assembled from pages of exactly that type.**

**Leg 2 — be named in other people's roundups**, in the order the engines actually returned
them: techradar.com, searchenginejournal.com, dageno.ai, trysight.ai, analyticsinsight.net,
seranking.com. Slow, mostly declined, and the only lever with direct evidence of moving the
category number.

**Leg 3 — fix the entity collision so a mention resolves to us.** Wikidata organisation item,
the visible unaffiliation line naming `aeoanalytics.com` / `aeoanalyzer.it` /
`aeo-analytic.com`, and the connected `@id` graph. This moves the accuracy layer, not the
category layer — and the Barbagallo misattribution is the reason to do it.

---

## Product gap this run exposed

The tool has the cited-source set. It does **not** classify what KIND of page those sources
are, so its advice stops at *"write the page that answers this question"* — generic — when
the evidence supports something far more specific: *"every source the engines used for this
question was a comparison/roundup page; the page you need is that page type, and here are the
nine that were cited."*

Dogfooding found this. It is the highest-value improvement available to the product, because
it is the difference between telling a customer to write content and telling them which
**shape** of content the engines will actually retrieve.

Filed as the basis for WO-AEO-ANSWER-SHAPE-009.
