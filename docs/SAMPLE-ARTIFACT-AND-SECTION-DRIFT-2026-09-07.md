# Two rulings prepared — Sep 7 2026

## Part 1 · Does the Meridian mock structurally resemble a real artifact?

**Yes. It is the executive report, section for section.**

| Meridian mock (blog HTML) | `renderExecReport()` in `src/lib/execReport.ts` |
|---|---|
| "AEO Analyzers · AI Visibility Executive Report" + brand headline | `# AI Visibility Executive Report — {brand}` (line 270) |
| Opening paragraph on why AI answers decide the sale | `## Why this matters` (273) |
| Three metric cards: branded retrievability, category citation win, cited instead | `## The headline` (276) |
| "What we found" with per-engine findings | `## Findings` (308) |
| "Your move" | `## Five prioritized actions` (347) and `## Next step` (364) |

It also carries the run-shape line the real generator emits — "60 live queries · four engines ·
every answer's transcript recorded".

**But applying your rule produces a circle, so I am not going to pretend it doesn't.** "Rename it
to that artifact" means calling it the AI Visibility Executive Report, which is exactly what it
already says. The mock is not mislabelled. **The name is accurate to the artifact; what is false
is the implied availability.** The executive report is generated only by an admin-side script and
cannot be bought.

So the honest framing of the choice is narrower than my earlier three options:

- **The page does not need a rename.** It needs either an availability sentence, or the product
  made buyable, or the sample replaced with one drawn from an artifact a customer *can* get.
- **Part 2 below retires the question entirely**, which is why I would spend the effort there
  rather than on wording.

Already shipped today, independent of this ruling: both "one-line install" telemetry claims are
off the page.

---

## Part 2 · Sizing the real-sample swap (not built — size and expected output only)

The "Meridian → automaker sample swap" has been in `FREEZE-REPORT-2026-07-31.md` since July 31.
Here is what it costs and what it would show.

### Which domain

**Recommendation: lanternpost.app, not an automaker and not a customer.**

| Candidate | Permission | Data on hand | Verdict |
|---|---|---|---|
| **lanternpost.app** | founder-owned, none needed | sweep `c9d75643` (Sep 2) + QA re-measure (Sep 5), pinned panel, 48 stored transcripts | **best** |
| aeoanalyzers.com | ours | full monthly series | on-brand but self-referential; the blog already tells this story |
| Dolphinpools.us | needs permission | two stored sweeps | viable, adds a real third-party voice, but costs a conversation and a redaction pass |
| Mazda | **no permission** | `templates/exec-report/mazda-sample.md` exists | do not publish a named third party's failing scores without consent |

### Cost

| Line | Size |
|---|---|
| Engine calls | **$0** — every number already exists in stored rows; no re-run |
| Path A: hand-build the HTML block from stored numbers, exactly as Meridian was built | **2–3 hours**, no code, no freeze exposure |
| Path B: teach `scripts/exec-report.ts` to render from stored `citation_sweeps` + `sweep_results` instead of a live sweep | **half a day**, and it is reusable for every future sample and for the courtesy-sweep pack |
| Redaction pass | ~30 min — founder-owned domain, so only competitor mentions to check |
| Review | founder eyes before publish |

**Recommendation: Path B.** It costs one extra half-day and leaves behind a generator that turns
any stored sweep into a sample, which is the thing we will want again for the courtesy pack and
for `/evidence`.

### What it would show, using figures already stored

Everything below is from `docs/baselines/lanternpost-question-panel.md` and the stored runs.
Nothing here is estimated.

- **Branded retrievability 6 of 8 = 75%.** Three engines find it every time; Claude finds it
  zero of two, reporting "search ran, site not found".
- **Category citation win 0%** across 24 runs on the questions a buyer actually asks.
- **Owned citation 100%** across 6 runs — when it *is* named, its own site is the source. The
  identity content is right; the reach is not.
- **Cited instead:** Paperless Post 6×, Hallmark 4×, Jacquie Lawson 1× — three named incumbents
  taking the answers.
- **Nine entity collisions**, including a Wikipedia disambiguation page.
- **A real authority gap:** invitedrop.com 24×, americangreetings.com 22×, sendwishonline.com
  14× — the sources the engines actually cite in that category.

### Why this is the on-brand fix

The Meridian numbers are invented and labelled. This one is measured and reproducible, and a
reader can check it: the domain is live, the questions are pinned and published, and the
transcripts are stored. For a company whose entire position is measurement honesty, an
illustration built from real data is not a nicety — it is the argument. It also demonstrates the
product on a second domain rather than only on ourselves, which answers the "you only ever show
your own site" objection before a prospect raises it.

**One thing to decide with open eyes:** the sample shows a founder-owned product scoring 0% on
category. That is the honest-zero thesis applied twice, which I think is the strength of it, but
it is a positioning call and it is yours.

---

## Part 3 · Product observation: SECTION-CONTEXT DRIFT (spec for v1.9)

**The observation.** On Sep 7 2026 Claude described AEO Analyzers as performing scans "as part of
customized governance assessments". That is false. It came from `pigenai.com/products/`, where the
**prose is accurate** and there is **no entity collision** — the product simply sits under a
section heading reading "AI-trust core — AI governance, visibility, and trust". The engine
generalised from the heading, not the paragraph.

This is a third, distinct failure mode. Our fidelity layer today catches two:

| Existing check | Catches |
|---|---|
| **Drift** (`src/lib/fidelity.ts`) | the engine asserts something false about the subject |
| **Entity-linking collision** (`src/lib/entityLinking.ts`) | the engine confuses the subject with a different entity |
| **→ Section-context drift (new)** | the engine describes the subject accurately *plus* an attribute borrowed from its surrounding page structure |

**Why it is detectable from data we already store.** The signal is vocabulary that appears in the
engine's description of the subject but appears **nowhere in the subject's own description** —
and that traces to a *container* of the subject: a section heading, a parent-company page, a
category listing. We already store the engine's answer text, the sources it cited, and a
`TruthRecord` for the subject's own site.

**Sketch of the check** (`src/lib/sectionDrift.ts`, deterministic, no LLM):

1. Take the noun phrases in the engine's description of the subject.
2. Subtract everything present in the subject's own served description, JSON-LD `description`,
   H1 and first 100 words.
3. For each survivor, look for it in the **headings** of the cited sources rather than their body
   text. A term that appears in a source's `<h1>`/`<h2>` but not in the subject's own description
   is a section-context candidate.
4. Report it as `section-context` with the source URL and the heading it came from — never as
   drift, because the sentence containing it is usually otherwise true.

**Fix path it should prescribe** — and this is what makes it a distinct check, because the
remedies differ:

- drift → correct the false fact at source;
- collision → disambiguate the entity;
- **section-context → change the *placement*, or add an explicit boundary sentence** inside the
  block ("a self-serve product with public pricing, not a consulting engagement"), so the heading
  cannot be read as the subject's category.

**Acceptance.** Fed the pigenai.com page and the Sep 7 Claude answer, the check reports
"governance assessment" as section-context sourced from the "AI governance" heading, and reports
zero drift and zero collisions. Fixture: `docs/DISCOVERABILITY-FINDINGS-2026-09-07.md` §4.

**Why it matters commercially.** It is a failure a customer cannot see and would never guess at.
Their copy is right, their entity is unambiguous, and the answer is still wrong — because of a
heading on a page they may not even own. No competitor in the authority table reports this.
