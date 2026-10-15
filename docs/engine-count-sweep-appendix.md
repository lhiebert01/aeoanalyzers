## Muse API check (WO-008 4.12), checked 2026-10-15

Meta's own developer pages show a public API for Muse models with live web search that returns its sources:
- "Meta Model API includes built-in web search grounding: real-time, cited answers with no retrieval stack to build or maintain." Add `{"type": "web_search"}` to a Responses API call. Muse Spark in public preview for US developers (post dated 2026-07-08). https://dev.meta.ai/resources/blog/build-with-muse-spark/
- Search grounding returns `url_citation` annotations with `url` and `title`; Responses API only; a search is not guaranteed on every question. https://dev.meta.ai/docs/cookbook/search-grounding

Result: an API exists, so **Line B** shipped ("We are evaluating it for the panel on the same terms as the others…"). FLAG for the founder: possible panel addition. Nothing was added to any panel.

## G7 propagation checklist (syndicated copies the agent cannot edit; for Lindsay, not posted)

| Where | Current-capability line still live | Replace with |
|---|---|---|
| Medium and Substack full-text copies of "I scored zero on my own tool" | "a tool that measures what ChatGPT, Claude, Perplexity, and Gemini actually say" | "a tool that measures what ChatGPT, Claude, Perplexity, Gemini and Grok actually say" |
| Same copies | "across all four major engines, repeatedly" | "across the major answer engines, repeatedly", and add the closing line "Updated October 2026: Pro and Business ask five answer engines, now including Grok. See We added a fifth AI engine (aeoanalyzers.com/blog/the-fifth-engine)." |
| Reddit / Hacker News comments from docs/launch/posse-i-scored-zero.md and the Part 1 launch kit | "I make a tool that measures what ChatGPT, Claude, Perplexity, and Gemini actually say" | Leave old comments as posted (dated); use the five-first sentence in any new comment |
| LinkedIn, X and Bluesky "How AEO Analyzers works" posts from the buyer-series pack (if posted) | "We ask four answer engines your buyers' questions" / "Four engines, buyers' questions" | Pack regenerated with "five answer engines on Pro and Business, four on the Day Pass"; edit posted copies where the platform allows |
| AlternativeTo listing description | "It asks ChatGPT, Claude, Perplexity and Gemini (plus Grok on Pro and Business)…" | The registry's new Long text (docs/identity/ENTITY-REGISTRY.md), word for word |

Dated lines in those copies ("all four find it", "98% branded retrievability", "across all four engines" for the July measurement) stay as published.

## Images

- /blog/how-it-works OG image: no engine count. No change.
- Homepage OG image (/aeo-og.png): carries the retired line "Multiple AI Engines. One Score. 90 Seconds." and the old label "Citation Probability". FLAG for a regenerate in a later order. Its alt text was corrected to describe the image (a sample AEO Score) instead of claiming four-engine sweep results.
- /blog/why-ai-doesnt-mention-you figure "Four assistants, four indexes": the figure draws four indexes; caption kept as the figure's own scope (ILLUSTRATIVE).

## AlternativeTo (WO-008 4.14)

- Live: https://alternativeto.net/software/aeo-analyzers/ (about page title "AEO Analyzers: Measures what AI answer engines say when buyers ask for a recommendation"); platform **Online**; license Freemium / Proprietary; developer PIGENAI LLC; listed 2026-10-15.
- Ledger: docs/launch/SOURCE-PRESENCE-WAVE-1.md, "Directory profiles — live record"; registry row live.
- sameAs: added to the SoftwareApplication node on aeoanalyzers.com only (`[Q141739225, AlternativeTo]`); Organization node unchanged (`[Q141739140]`). Not added on pigenai.com: its identity graph is frozen except for Wikidata.
- Watch list: src/data/corpus-watch.json; the November 1 self-sweep filing reports category answers citing it.
- Listing check: the "for Mac, Windows and Linux" phrase is on the alternatives page and describes the other apps' platforms; our listing's platform is Online (correct). Mismatch to fix by hand: the description is four-first; replace it with the registry's new Long text.
