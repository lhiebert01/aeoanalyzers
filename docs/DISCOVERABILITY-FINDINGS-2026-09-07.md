# Discoverability findings — Sep 7 2026

Three engines index aeoanalyzers.com. One does not. This records what was tested, what was
found, and what each finding rules in or out. Every result is from a live engine call through
the same adapters production uses.

---

## 1 · The duplicate-shell hypothesis is dead

**Hypothesis:** multiple URLs serving byte-identical prerendered-homepage shells was a
duplicate/thin-content signal, and the reason Claude's index has nothing for aeoanalyzers.com.

**Killed by three things:**

1. Every shell URL carries `<link rel="canonical" href="https://aeoanalyzers.com">`, so a
   crawler honouring canonicals collapses them rather than seeing duplicates.
2. ChatGPT, Perplexity and Gemini each score 10/10 on branded retrievability against this
   identical structure. A defect three engines shrug off is unlikely to stop the fourth alone.
3. **Decisive:** Claude cannot find the *static* pages either. `/blog/i-scored-zero` is
   prerendered, JS-free HTML with unique sentences, and it is absent from the index. Nothing
   about shells explains that.

**Consequence:** multi-route prerendering is demoted from a Claude fix to a buyer/UX fix. It is
still worth doing — `/pricing` and `/terms` being invisible to anything that does not run JS is
indefensible on a product taking payments — but it will not move Claude.

## 2 · The test, verbatim results

| # | Question to Claude (web search on) | Result |
|---|---|---|
| A | Which website published the sentence "AI companies' crawlers had visited my site 265 times"? | Searched. **Did not find us.** Misattributed it to prometora.com. Sources: ppc.land, conductor.com, cybernews.com, technologychecker.io, prometora.com |
| B | Is there a blog post titled "I Ran My Own AI-Visibility Tool on My Own Site. It Scored 0%."? | Searched. **"Could not find a blog post with that exact title."** Offered a Search Engine Land article instead |
| C | What is aeoanalyzers.com? | Searched. **No page from the domain in sources.** Answered from `pigenai.com/products/` |

In none of the three did aeoanalyzers.com appear in the sources.

## 3 · The misattribution was a hallucination, not a scraper

**Checked:** `https://www.prometora.com/learn/ai-crawler-data`.

That page contains no sentence of ours, no reference to 265 visits in the thirty days to July 31,
and no mention of AEO Analyzers, aeoanalyzers.com or Lindsay Hiebert. It is an unrelated report
logging 604 AI-bot visits across 13 marketplaces over 7 days in July 2026.

**So no scraper is outranking the original.** Claude found a topically adjacent page about AI
crawler counts and asserted our sentence appeared on it, inventing a plausible source for a
sentence it could not locate. That is precisely the fidelity failure this product exists to
measure, observed against our own content: an engine stating something false about a page it
never read.

Worth keeping as a fixture. It is a cleaner example than the Jesper Nissen case because the
ground truth is unambiguous — the page is public and demonstrably does not contain the text.

## 4 · What the engine says instead, and why

Claude's answer to "What is aeoanalyzers.com?" ended: *"It performs visibility scans across the
four major answer engines **as part of customized governance assessments**."*

The last clause is false. Its source is `pigenai.com/products/`, where AEO Analyzers is placed
inside an "AI-trust core — AI governance, visibility, and trust" section and referenced as part
of the Executive AI Trust Assessment. The paragraph is accurate; the **section heading** is what
the engine generalised from.

**This is the finding with the highest leverage on the list.** pigenai.com is indexed and
aeoanalyzers.com is not, so the hub page is currently the authoritative public description of
this product — and it is wrong about what the product is. Handover with exact copy filed at
`private/outreach/HANDOVER-IDENTITY-SESSION-PIGENAI-2026-09-07.md`.

## 5 · Working theory, and what would move it

**Undiscoverability.** aeoanalyzers.com is not in the index Claude searches. Contributing
factors, in the order I would weight them:

1. **No inbound links from indexed domains.** The one PIGENAI property that *is* indexed links
   to us, and that link is the cheapest lever available.
2. **A very small surface.** Seven distinct pages, four of which were undeclared in the sitemap
   until today.
3. **Domain age.** The series anchor is only five weeks old.

**What would confirm:** aeoanalyzers.com appearing in Claude's sources after inbound links land,
with no change to page structure.

**What would kill it:** aeoanalyzers.com appearing in Claude's sources *without* new inbound
links — which would point at an indexing lag rather than a link deficit.

**Not yet ruled out and worth one check:** whether the search provider behind Claude has the
domain at all. The founder is checking `site:aeoanalyzers.com` on Brave in parallel.

## 6 · Standing note

Re-run the three questions in §2 at every monthly re-measure and record the result here. The
first month any of them returns an aeoanalyzers.com source is the month the index gap closed.

| Date | A | B | C | Notes |
|---|---|---|---|---|
| Sep 7 2026 | not found | not found | answered from pigenai.com | baseline |
