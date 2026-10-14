# HOLD — "The query you never typed"

**Do not publish until WO-006 Item E is proven end to end on the second Google account and the founder says so.** This is marketing copy for an unreleased feature. It lives in the repository as a draft only. When released it becomes its own post in the Buyer Series ("The query you never typed"), not an insert into *The Measurement Layer*.

Wording has been corrected against the editorial review: the classification is a heuristic with a confidence, so the post says "estimated" and "classified", never "true" or "count". Google does not label a query's origin.

---

## The query you never typed

There is a second measurement that lives on data you already own, and it addresses a mistake many marketing teams may be making without knowing it.

When someone asks Google's AI Mode or AI Overviews a question, Google's AI does not run one search. It breaks the question into several sub-questions of its own and runs each against the normal search index to gather material. Google calls this query fan-out. Those machine-written sub-queries tend to look unlike what a person types: long full sentences, oddly specific, sometimes carrying instructions about the format of the answer.

Here is the catch for a website owner. When one of those sub-queries pulls up your page, Search Console records an impression. Your page was shown. But no human saw it, so nobody clicks. Impressions rise, clicks stay flat, and click-through rate falls. A team looks at the chart, sees CTR dropping, and concludes their titles or content are failing. They rewrite pages that were fine. The machine traffic was simply mixed in with the human traffic.

AEO Analyzers connects to your Google Search Console, read-only, and classifies your query list into "looks machine-written" and "looks like a person typed it", using a rule set you can read, with a confidence on every row. It then shows impressions, clicks and CTR for each group separately. Two things fall out. The first is an **estimated** human CTR, which is often healthier than the blended number. The second is an **estimate** of how often Google's AI appears to be reading your pages, which is itself a visibility signal.

Google never labels a query's origin, so we never say "this was a bot" as fact. We say which rule fired and how confident the classification is, and we say plainly that it is a classification. It is Google-only; it cannot see ChatGPT, Claude, Perplexity or Gemini. Google anonymises rare queries, so part of the long tail is invisible by construction. Results depend on the connected property's own coverage. All of that is stated on the page, not in a footnote. The honesty is what makes it useful.
