# How AEO Analyzers Works: The 90-Second Tour of a Hundred-Hour Analysis — DRAFT

**STATUS: DRAFT — REVIEW-GATED — DO NOT PUBLISH.** Publishes only on founder go-word,
**after Part 2 (/blog/reading-isnt-citing) is live** (this piece references its concepts;
Visual 4 ships with Part 2 first). Target: **week of Aug 10.** Diagrams may be built ahead.
- **Slug (proposed):** `/blog/how-it-works`
- **Doctrine:** publish the science (the pipeline, the layers, the deliverables), protect the
  engineering (no prompts, thresholds, heuristics, classifier internals, fixtures).
- **Voice-lint applies** · every number from a dated stored record · canonical on-site (POSSE)
  · own OG card from the blog template.
- **Numbers of record used below** cite the dated **SERIES ANCHOR — Aug 1 2026**
  (branded 100% N=40 · category 0% N=200, high confidence) and the launch baseline
  (265 crawler visits in the thirty days to Jul 31). Live values stay in the dashboard.

---

## The draft (visual insertion points marked [VISUAL n])

### Hook
Most "AI visibility" tools hand you a number and a vibe. This one shows its work — every
question it asked, every engine it asked, every answer it got back, stored so you can
re-run it yourself. Here's the whole pipeline, end to end, in the time it takes to read it.
What takes a web team a hundred hours to reason through by hand, the analysis does in about
ninety seconds — and then leaves the receipts.

[VISUAL 1 — THE PIPELINE]

### Stage by stage
**1. We read your site.** You give a domain; we read the live page and propose your brand,
your category, your closest competitors, and a set of buyer questions. You confirm or edit
every field before anything runs — the instrument starts from what's actually on your page,
not a guess about it.

**2. The questions.** Twelve questions a real buyer would type — three kinds: *about you*
(are you found when named), *category* (are you recommended when nobody names you), and
*head-to-head* (the alternatives-and-versus questions). These are the questions your buyers
ask AI before they ever reach your site.

**3. The interrogation.** Every question goes to four answer engines — ChatGPT, Claude,
Perplexity, and Gemini — with web search on, several times each. Why several? Because an AI
answer changes from run to run; one answer is an anecdote, a pattern is a measurement. And
we separate answers the engine actually *searched the web* to produce from answers it gave
*from memory* — they mean different things, so they're never blended.

[VISUAL 3 — WHY SEVERAL RUNS]

**4. The measurement.** Every answer is scored on three separable layers — found by name,
recommended to buyers, and who gets cited instead — plus an accuracy check (did the engine
get your facts right?) and a look-alike check (is it confusing you with a similarly named
company, a stock ticker, a different site?). Every number ships with how many times we asked
and how confident that makes the result.

[VISUAL 2 — THE THREE LAYERS]

**5. The deliverables.** A plain-English scorecard, the full set of stored transcripts, and
an action plan: the structural fixes, the exact questions to turn into content, and a source
list sorted by how attainable each one actually is.

[VISUAL 5 — THE ATTAINABILITY LADDER]

### Why "read" and "cited" are different numbers
In the thirty days to July 31, AI crawlers visited our own site 265 times. They'd read
everything. On the buyer questions that matter, they recommended us zero times. Being read
is not being cited — and the two live on different pipelines, on different clocks.

[VISUAL 4 — READING ISN'T CITING]  *(shared with Part 2)*

### What we deliberately don't do
- No guarantees — we report what the engines did, not what they'll do next.
- No invented numbers — every rating, count, or percentage comes from a stored record, and
  the tool won't paste a statistic onto your site that isn't already on your page.
- No gray-hat shortcuts — no cloaking, no borrowed-authority seeding. We measure honestly and
  hand you fixes you can stand behind.

### Fix, then prove
Two instruments, one loop. The **AEO Score** asks *is your site built to be cited?* — the
inside-out readiness measure, with the fixes to raise it. The **Citation Sweep** asks *are
you actually cited?* — the outside-in proof from the engines themselves. Fix with the Score;
prove with the Sweep; re-sweep monthly to watch the gap close.

[VISUAL 6 — FIX ↔ PROVE]

### CTA
See what the engines say about your business — the first look is free and takes about ninety
seconds. Whatever your number is, better you find it than your next prospect. → aeoanalyzers.com

---

## VISUAL SPECS (for image generation)

**Shared brand system (all six):** ink field (#0E1B16 family), teal accents, flat vector, no
gradients/no glow, Space Grotesk for display / Inter for labels. SVG preferred (crisp,
themable, extractable). Light- and dark-safe. Each visual is itself an AEO asset, so the alt
text is written to be descriptive and quotable.

### VISUAL 1 — THE PIPELINE (hero)
- **Layout:** five stages left→right on a single arrow spine; a curved **loop arrow** from
  stage 5 back to stage 3.
- **Nodes (label + sublabel):**
  1. *Your domain* — "we read your site → brand · category · competitors · draft questions (you confirm)"
  2. *The questions* — "12 buyer questions · about-you · category · head-to-head"
  3. *The interrogation* — "4 engines × every question × several runs · web search ON" with a
     small visible fork labeled *search-grounded* / *from-memory* (kept separate)
  4. *The measurement* — "3 layers scored · accuracy check · look-alike check · N & confidence on every number"
  5. *The deliverables* — "scorecard · stored transcripts · action plan (code fixes · content agenda · tiered sources)"
- **Loop caption:** "Re-sweep monthly — same questions, same way — watch the number move."
- **Alt text:** "A five-stage pipeline: AEO Analyzers reads your site to propose brand,
  category, competitors and questions; forms 12 buyer questions in three kinds; asks four AI
  engines each question several times with web search on, keeping search-grounded answers
  separate from from-memory ones; scores three layers with an accuracy and look-alike check
  and a sample size on every number; and returns a scorecard, stored transcripts, and an
  action plan. A loop arrow returns to the interrogation stage: re-sweep monthly, same
  questions, same way."

### VISUAL 2 — THE THREE LAYERS (triptych)
- **Layout:** three equal panels.
- **Panels (title / caption):** *Found by name?* / "when buyers ask about you" · *Recommended?*
  / "when buyers ask the category" · *Who's cited instead?* / "the names taking your spot."
- **Alt text:** "Three panels naming the three things a Citation Sweep measures: whether AI
  finds you when buyers ask you by name, whether AI recommends you when buyers ask about the
  category, and which competitors get cited in your place."

### VISUAL 3 — WHY SEVERAL RUNS (coin-flip grid)
- **Layout:** a 4×5 grid — 4 engine rows × 5 run columns — cells marked cited / not-cited for
  one question, deliberately varying across the row.
- **Caption:** "One answer is a coin flip. The pattern is a measurement."
- **Alt text:** "A four-by-five grid of one question asked to four AI engines five times each.
  Cells vary between cited and not-cited across the runs, showing that a single answer is
  unreliable while the repeated pattern, with its sample size, is a real measurement."

### VISUAL 4 — READING ISN'T CITING (two pipelines) — *dual-use with Part 2*
- **Layout:** two horizontal pipelines. Top: *training crawlers* ingesting many pages into a
  model — slow, diffuse. Bottom: *live retrieval* at answer time racing a short ranking
  contest to pick a few sources — instant, selective.
- **Caption:** "Being read (top) and being cited (bottom) run on different pipelines, on
  different clocks."
- **Alt text:** "Two contrasting pipelines. The top shows training crawlers slowly ingesting
  many web pages into a model. The bottom shows live retrieval at the moment a buyer asks,
  quickly selecting a few sources to cite. Reading happens on the top pipeline; citing on the
  bottom — which is why a heavily crawled site can still go uncited."

### VISUAL 5 — THE ATTAINABILITY LADDER
- **Layout:** three rungs, low→high.
- **Rungs:** *Do now* — "self-serve: your profiles, your pages" · *Earn* — "pitchable:
  roundups, communities" · *Aspirational* — "labeled honestly, not assigned as homework."
- **Caption:** "An action plan should spend your time where movement is possible."
- **Alt text:** "A three-rung ladder sorting the sources AI engines trust by how attainable
  they are: 'do now' self-serve profiles and pages, 'earn' pitchable roundups and
  communities, and 'aspirational' sources labeled honestly rather than assigned as busywork."

### VISUAL 6 — FIX ↔ PROVE (Score vs Sweep)
- **Layout:** two gauges side by side, an arrow between them.
- **Gauges:** *AEO Score* — "Is your site built to be cited? (inside-out · the fixes)" ·
  *Citation Sweep* — "Are you actually cited? (outside-in · the proof)."
- **Arrow caption:** "Fix with the Score → prove with the Sweep."
- **Alt text:** "Two gauges. The AEO Score, an inside-out readiness measure, asks whether your
  site is built to be cited and provides the fixes. The Citation Sweep, an outside-in measure,
  asks whether the engines actually cite you and provides the proof. An arrow links them: fix
  with the Score, prove with the Sweep."

---

## Explicitly protected — do NOT depict or describe in any visual or caption
Question-generation logic/biases · entity-collision heuristics & fixtures · fidelity
classifier internals · truncation / model-prior implementation · tier-classification rules ·
any prompt text or threshold. The diagrams show the PIPELINE (stages, layers, deliverables),
never the algorithms.

## Publish checklist (when Part 2 is live + founder go)
- Canonical on-site (`/blog/how-it-works`); syndicate per POSSE with canonical back.
- Own OG card from the blog template (kicker "AEOANALYZERS.COM · BLOG"); add
  `og-blog-how-it-works.png` + width/height 1200×630 + own description.
- Run voice-lint over final copy; confirm every number resolves to a dated stored record.
- Embed the six SVGs with the alt text above (they're AEO assets — alt text matters).
