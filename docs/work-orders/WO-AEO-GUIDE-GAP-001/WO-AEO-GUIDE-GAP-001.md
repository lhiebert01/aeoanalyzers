# WO-AEO-GUIDE-GAP-001 — What the market's AEO guides tell buyers, what we already answer, and what to write and build next

**For:** the aeoanalyzers.com session (aeo-app1)
**From:** Lindsay Hiebert, Founder and CEO, PIGENAI LLC, via the Cowork strategy session
**Issued:** 22 September 2026
**Supersedes:** nothing. Sits beside WO-AEO-SEO-VS-AEO-EXPLAINER-001 v2, WO-AEO-POSSE-LILYPATH-001 and WO-AEO-BLOG-CANCELLATION-001, all of which stay ahead of anything new here.
**Freeze status:** GTM-90 holds until 1 November. Product work in this WO is bugs, truth fixes and paying-customer blockers only. Everything else is sequenced onto the v1.9 roadmap in priority order and waits.

---

## 0. The one-paragraph version

A generic "AEO master guide" arrived today: an unsourced tool roundup with a maturity framework and a list of five must-have capabilities. It is not a source and nothing in it can be republished. But it is a useful map of what buyers are being told, and read against our blog and our product it shows three things. First, the capabilities it calls indispensable are ones the product already has, in most cases with a sharper definition than the guide's. Second, the two practitioner truths it states best, that single runs are noise and that the question set is the instrument, are things the product was built around and the blog has never said in a dedicated post. Third, the one capability it names that we do not have, a sentiment score, is one we should decline on purpose and say why. The work is four posts in priority order, six freeze-compliant truth fixes now, and a ranked v1.9 list. Nothing in it overrides the queued work orders.

---

## 1. Before anything in this WO: verify the September series post is live

The blog index promises a monthly re-measure "published whatever it says." The founder decided on 7 September to publish the September number now, decoupled from D1. The index supplied today shows no September series entry.

**Action:** confirm whether the September re-measure post is live at a /blog/ URL and listed on the index. If it is not, it goes first. The 1 October re-measure is nine days away, and a series that promised monthly reporting must not have October's number before September's is out. Publishing a regression is the strongest proof the series is real; the gap is the one failure that damages the brand more than a bad number.

Before it publishes, verify against docs/baselines/aeoanalyzers-2026-09-01.json that the branded figure quoted is the post-correction number (the site-not-found rule and the errored-run exclusion both changed scores after the first run). The post needs three things beyond the pre-write, per the 7 Sep record: the corpus-presence finding (0 of 200 cited-source sets; the string appears in 0 of 200 answers: absent, not ranked last), the Claude-absence finding (three engines find the site, one has never indexed it), and the self-correction disclosed as openness.

If it is already live, skip to §2 and note the URL in the close-out.

---

## 2. Verdict on the guide

**Do not republish, quote, cite or adapt it.** It has no author, no date, no links and no measured figures. Under our own standard every competitor fact is dated and linked to the vendor's own page, we name no winner and rank nothing, and no sample figure goes out unlabelled. The guide fails all three, and its "recommended stack per stage" is exactly the shape we do not produce.

**Use it for one thing:** a checklist of what buyers who read guides like this will expect to find on our site, in our product, and in the words we use. The gap matrix in §3 is that checklist.

**Two observations to keep, not to publish.** The first-listed tool gets the longest and most favourable entry, and the document reads as if written by or for that vendor. That is the "category winners get cited through their own comparison content" mechanism seen from the outside, which is the argument for our own comparison content, already made in the 7 Sep record. And AEO Analyzers is absent from it entirely. If this guide lives on a published page, add that page to the listicle-pitch target list under the evaluate-don't-praise rule. If it is an AI-generated draft, it is not a target and not a source.

A full copy sits in `reference/master-guide-as-received-2026-09-22.md`, marked unverified.

---

## 3. Gap matrix

Guide claim or capability, against what we have published and what the product does. "Blog" refers to the index snapshot in `reference/blog-index-snapshot-2026-09-22.md`.

| What the guide says matters | Already on the blog? | Already in the product? | Gap, and what to do |
|---|---|---|---|
| The funnel shifted: query → AI answer → maybe a mention → maybe a click | Yes. "Is your brand the answer AI gives" (Jul), "no page two in an AI answer." SEO-vs-AEO explainer queued. | n/a | Covered. The queued explainer should carry "clicks are secondary" plainly if it does not already. No new post. |
| AEO vs SEO comparison table | Queued: WO-AEO-SEO-VS-AEO-EXPLAINER-001 v2 | n/a | The guide is corroboration that the topic has demand. Do not duplicate. |
| Multi-model tracking: OpenAI, Claude, Gemini and AI Overviews, Perplexity | Yes. Four engines in every post. | Yes, four engines. **Not AI Overviews.** | State the scope plainly wherever engines are listed: Gemini chat, not Google AI Overviews. See §5 C5. |
| Citation context: hierarchy (first/middle/last) | Mentioned in passing | Yes: PAWC prominence-weighted answer share (E1). | Surface "where in the answer" in plain words on the report if it is computed but not shown. §5 C4. |
| Citation context: sentiment | No | **No, by design.** We classify fidelity: accurate / drifted / fabricated detail / entity collision, and section-context drift is specced. | Decline sentiment on purpose and say why. Post B4. |
| Citation context: co-occurrence with competitors | Yes: cited-instead in Part 1 and the action-plan post | Yes: cited-instead table, real-competitor extraction (C1), losing-questions agenda. | Name it for buyers who arrive with the guide's vocabulary. §5 C3. |
| Share of voice across prompts | Partly | Yes: share of category, PAWC. | Covered in product; explain the measure inside post B1. |
| Prompt gap analysis: queries where competitors are recommended and you are not | Yes, as "per-question battle-map" | Yes: per-question battle-map + cited-instead. | Same as co-occurrence: label it so a reader who searched "prompt gap analysis" recognises it. §5 C3. |
| Actionability and remediation: schema, structuring, content | Yes: "What you actually get" (five-layer plan) | Yes, and stronger than the guide describes: paste-in JSON-LD, corrections, off-site plan from real citations, battle-map, reproducible proof. | Covered. The next step is WO-PLAYBOOK-001 (per-tier recipes, paid only), which is v1.9. §6 P5. |
| Non-deterministic outputs: track trends, not snapshots | Stated in passing ("measured five times per query") | Yes: reps=5 headless, N and confidence per cell, errored-run and truncation exclusion, monthly series. | **Gap.** No dedicated post. This is the guide's best true point and our strongest methodology story. Post B1, first. |
| Prompt design supremacy: the dashboard is only as good as the prompt set | No | Yes: versioned 12-question panel per domain, ICP segmentation (C3), buyer-phrasing vs agency queries, pinned series set; config memory (P1-B) in progress. | **Gap.** Post B2. The Lantern Post auto-guess correction is the worked example, from stored data we own. |
| Brand positioning over backlinks; recurring third-party citations | Partly: Part 2 "reading isn't citing," the primer | Yes as diagnosis (attainability tiers, authority gap). Corpus-presence metric defined, lower bound only. | **Gap,** and the data is better than the guide's claim: 0 of 215 cited sources name us; the corpus consolidated 296→215; competitors win by being cited as sources. Post B3, or the spine of the 1 Oct series entry. Product: §6 P3. |
| Organisational silo: integrate AEO into SEO and editorial workflows | No | n/a | Audience mismatch. Our buyers are founders, small marketing teams and agencies. Skip. |
| Maturity framework: which tool at which stage | No | n/a | Ranks and recommends vendors by tier. Off-canon. Skip. The Buyer's Standard already covers scale and economics without ranking. |
| Legacy SEO suites cannot see the conversational layer | Yes, across the buyer series | n/a | Covered. Do not write it as a knock. |

---

## 4. Blog: four posts, in priority order, after the queued three

Every post below obeys the standing rules without exception: names no vendor except in dated, linked, method-only comparison content; ranks nothing; no fabricated statistic or superlative; sample figures labelled; no attestation and no implied claim by contrast ("unlike some tools"); nothing about a competitor's quality; nothing publishes on a single-engine capture; 40-to-60-word answer-first block under a query-shaped H2; the product name is "AEO Analyzers," spaced; publish-the-science, protect-the-engineering (principles yes, prompt text, thresholds and classifier internals never). Everything drafts behind noindex on a review branch and publishes only on the founder's go-word. Any edit to already-published body text triggers the G7 propagation checklist.

Cadence: the 1 October series post is fixed. B1 and B2 are October. B3 folds into 1 October or follows it. B4 waits on the Part 3 decision. Do not schedule more than two new posts in October beyond the series entry.

### B1 — "Why we ask every question five times" (methodology; publish first)

**The gap it fills.** The guide's most useful true sentence is that LLM outputs vary and a single snapshot is noise. The product was built around that fact, the Buyer's Standard names "verify" as a purchasing requirement, and no post explains it. This is definitional AEO content: the kind of page an engine cites when someone asks whether AI-visibility scores can be trusted.

**What it says.** Why one run of one question is not a measurement. What N and confidence mean on our report. Why search-grounded and model-prior answers are kept apart and why that changes the number. What happens to a run that errors or truncates, and why it is excluded rather than scored as zero. Why the series pins its question set so month-to-month movement means something.

**Evidence, all owned and dated.** The 2 September run where Perplexity rate-limited 56 of 60 runs: what a single-run tool would have reported, what we reported instead, and the fix. The branded false positive where an engine's "I can't find your site" clause was scored as a mention, caught, corrected, and re-scored across stored sweeps. Both disclosed as openness, per the Sep 18 rule: self-disclosure of our own numbers is framed as what we found and fixed, never as shortfall.

**Query shapes it answers.** "Are AI visibility tools accurate." "Why does my AI visibility score change." "How many times should you run a prompt to measure AI visibility."

**Links.** /methodology (once merged), the 90-second tour, the Buyer's Standard (verify, receipts), Part 1.

**Do not.** Describe any competitor's sampling. Say "a tool that runs each question once" only as a general pattern. Publish prompt text or thresholds.

### B2 — "The question set is the instrument" (prompt design)

**The gap it fills.** The guide is right that a dashboard is only as good as its prompt set, and says nothing about how to build one. We have a method: a crawl plus a model proposes a twelve-question panel per domain, segmented by ICP, buyer phrasing separated from agency phrasing, versioned, and pinned for a series.

**The worked example, from data we own.** The Lantern Post baseline on 2 September: the auto-guess proposed category "interactive digital greeting cards," competitors Punchbowl and Kudoboard, and a panel aimed at group cards and invitations. That is the wrong buyer for a free individual-sender card. The panel was corrected by hand before the run. The post shows the wrong panel, the right one, and why the difference is the whole measurement. Lantern Post is founder-owned, so consent is free and figures are real.

**What it teaches.** How to tell a buyer question from a vendor question. Why a panel is versioned and what changes when it is not. Why "we guessed these" appears in the product and what to do when the guess is wrong. What config memory (P1-B) is for, described as a principle rather than an implementation.

**Query shapes.** "What prompts should I track for AI visibility." "How to choose queries for AEO monitoring." "Why does my AI visibility tool ask the wrong questions."

**Do not.** Name Punchbowl or Kudoboard as anything other than the auto-guess's proposed competitors. Publish the panel-generation heuristics.

### B3 — "0 of 215: where category answers actually come from" (corpus presence)

**The gap it fills.** The guide says brand positioning beats backlinks and that recurring third-party citations win. Our data says it more precisely and more usefully: across 200 category runs the domain appeared in 0 cited-source sets and 0 answers. Absent, not ranked last. The set of sources the engines cite for our category consolidated from 296 distinct hosts in August to 215 in September. Competitors are winning by being cited as sources, not by being listed.

**Placement.** This is the natural spine of the 1 October series entry. If the September post already used the corpus finding, B3 is a standalone that goes deeper: the source types (vendor sites, review platforms, press, community), what consolidation means for anyone entering late, and why no self-serve step reaches a page someone else publishes.

**Naming rule.** Name non-competitor source domains freely (review platforms, press, community sites). Name competitor domains only as method-only counts with the month, or as "two vendor domains" if the founder prefers. Never characterise their content.

**Query shapes.** "Why does ChatGPT recommend competitors and not us." "How do AI assistants pick which sources to cite." "How to get cited by AI answer engines."

**Do not.** Turn it into a pitch for the listicle program. Describe the reviewer layer as anything other than where the citations are.

### B4 — "How the AI describes you: what we check, and why it is not a sentiment score" (fidelity)

**The gap it fills.** Several tools, and the guide, sell sentiment (positive, neutral, critical). We measure fidelity: is what the answer says about you true, drifted, fabricated, or about a different entity with a similar name. The post explains the choice as method, not as a knock: a sentiment label cannot be checked against a source; a fidelity finding can, because it names the sentence and the source it contradicts.

**Evidence.** The invented co-founder (Part 3, once released; co-founder and engine unnamed). The entity collisions on the product's own name. The section-context case where accurate prose under the wrong heading produced a wrong answer, which the customer's own copy could never have revealed.

**Dependency.** Part 3 is behind noindex awaiting the go-word. B4 can publish without it by leaning on collisions and section-context drift, but it is stronger after. Sequence it for November unless Part 3 is released sooner.

**Do not.** Say sentiment is useless, wrong or a "mood ring." Say what we chose and why it can be verified. The Sep 18 rule applies to how other tools' methods are described.

### Not recommended

- A meta-post reviewing the genre of AEO master guides. It would be critical of a genre, which the Sep 18 rule rules out, and the Buyer's Standard already does the constructive version.
- An "organisational silo" post. Wrong audience.
- A maturity framework. It ranks vendors.

---

## 5. Product, freeze-compliant now: truth and copy

Each of these is a truth fix or a paying-customer-facing correction, and none adds a feature. Ship behind the standing proof rule: external-fetch proof, Vercel deployment ID and commit hash, with the serving bundle checked rather than the repo.

**C1 — Reconcile "several times each" with what the UI actually runs.** The 2 September Lantern Post run showed reps=1 in practice from the UI while page copy said "several times each" and the agent believed the default was 3. WO-AEO-SWEEP-INTEGRITY-002 Lane B carried "reps reconciliation." Verify it shipped. If the UI runs one rep per question per engine, either the copy changes to say so or the UI runs what the copy says. B1 cannot publish on top of a claim the product does not meet.

**C2 — N and confidence on every customer-facing number.** Report screen, saved view, Word export and the executive-report renderer. Verify parity; the Sep 2 diff proof found three fields that differed between live and saved. Any number without its N is a number a buyer cannot check.

**C3 — Name the views in the words buyers arrive with.** The cited-instead table and the losing-questions agenda are, in the guide's vocabulary, "prompt gap analysis" and "co-occurrence." Add one plain sentence beside each on the report and on the What-you-actually-get post so a reader who searched those phrases recognises what they are looking at. Copy only. Do not rename the features.

**C4 — Surface answer position if it is computed but not shown.** PAWC prominence weighting exists (E1). If the report does not show where in the answer a mention sat, and showing it is a display change rather than a scoring change, show it in plain words ("named first," "named after two others"). If it is more than a display change, it moves to §6.

**C5 — Scope statement on engines.** Wherever the four engines are listed (pricing, methodology, tour, report header): Gemini chat, not Google AI Overviews. The Sep 13 ruling closed the only third-party source that covers Overviews and it is not to be re-opened. Say the scope plainly so no buyer who read a guide assumes it.

**C6 — /best-aeo-tools freshness discipline.** The comparison post is live. Confirm every competitor claim carries its last-verified date and that the quarterly re-verify (G5) is calendared. Before the 8 October wire submission, re-verify the two competitors named in the release body.

---

## 6. Product, v1.9 after 1 November: ranked

These wait for the freeze to lift. The order is the recommendation; the founder re-ranks as he sees fit.

**P1 — Finish config memory (P1-B).** In progress. A customer's corrected panel and competitors persist per user and domain, prefill on the next sweep, with a visible reset. This is the prerequisite for any customer's month-to-month comparison meaning what ours does. It is also what B2 describes.

**P2 — Scheduled monthly re-measure with movement column and email digest (K1).** The guide's "track probabilistic trends over time" is this feature. The honest-zero series is the mechanism, run by hand, for one domain. The stored-sweep renderer already emits a movement column in comparison mode. Productise it for every paid plan: same panel, same reps, same day each month, a digest that says what moved and flags a flat column after an on-site change as "not yet recrawled." This is the single feature that turns a report into a subscription.

**P3 — Corpus presence as a customer metric.** Defined on 7 Sep: of the distinct source hosts cited across your category questions, how many name you. Today it is a cheap lower bound because the strict numerator needs a fetch pass over cited URLs. Build the fetch pass and surface the metric per sweep, with the denominator's month-over-month change. Per the founder's own notes, no competitor in the authority table reports this, and it is the leading indicator the series now uses.

**P4 — Section-context drift as the third fidelity check.** Specced 7 Sep with the pigenai.com case as the acceptance fixture: accurate prose, no collision, wrong answer, caused by heading hierarchy. Its fix path is placement, which is why it is a third check rather than a variant of drift or collision. It is a failure the customer cannot see in their own copy, and no competitor reports it. B4 will describe it; the product should detect it by then.

**P5 — WO-PLAYBOOK-001 recipes, paid only.** The guide's "actionability" is remediation the product already prescribes on-page. Off-page, the product labels tiers but does not hand over the recipes the founder executed (Wikidata anchor with pre-filled values, own comparison page, /evidence pattern, answer-shaped pages, evaluate-don't-praise listicle pitch aimed at the customer's own cited-instead table). Tiering ruling stands: recipes and personalised fill-ins are paid only; the free check shows tier labels and a teaser; public pages teach principles only.

**P6 — Executive report as a purchasable artifact: deferred, on purpose.** The renderer exists and reproduces a pinned baseline exactly. The agent's recommendation stands: both sale options carry a human review obligation that gets missed under load. Keep it internal until the review has a person. The availability sentence on the blog is correct as shipped.

**P7 — Agency multi-client and white-label (K2).** Contact Sales is the answer today and it is verified working. Audit-only pre-work until a paying agency asks.

### Not to build, and why

- **A sentiment score.** Declined by choice; see B4. It cannot be verified against a source, and it is the metric the guide's tools sell. Fidelity is ours.
- **A third-party mentions data layer.** Ruled out 13 Sep after a same-day evaluation. Do not re-propose.
- **Google AI Overviews coverage.** Not measured, and the only data source that covers it is the one above. State the scope, do not claim it.
- **Crawler telemetry for customer domains.** Ruled undeliverable; claim removed from pricing and landing page. The product reads its own logs only. Drift monitoring is the honest replacement and is already shipped.

---

## 7. Close-out

One close-out document, `docs/CLOSEOUT-WO-AEO-GUIDE-GAP-001.md`, plus a copy to Downloads as .md and .docx. It records:

1. §1: the September series post URL, or the date it went live under this WO, with the verified branded figure and its baseline file.
2. §5 C1–C6: for each, the commit hash, the Vercel deployment ID, and the external-fetch proof against the serving bundle. A repo change is not a close-out.
3. §4: the review-branch URL for each post drafted, the noindex guard confirmed, and the go-word status. Nothing in §4 publishes under this WO without the founder's word.
4. §6: no work, only the ranked list confirmed into the v1.9 roadmap file with dates.
5. A one-line answer to: is the master guide published anywhere? If yes, the URL and whether it was added to the listicle target list.

Per the standing rule, no ✅ without external proof. Repo state and production state are reported separately.

---

## 8. What is in this hand-off

- `WO-AEO-GUIDE-GAP-001.md` — this document
- `reference/master-guide-as-received-2026-09-22.md` — the guide, verbatim in substance, marked unverified, not for citation
- `reference/blog-index-snapshot-2026-09-22.md` — the blog index as supplied, with the queued work orders listed

One work order, one zip. Nothing else is needed to start.
