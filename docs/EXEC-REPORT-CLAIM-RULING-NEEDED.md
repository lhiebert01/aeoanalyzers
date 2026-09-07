# "AI Visibility Executive Report" — verified, ruling needed. Draft only, not shipped.

**Question asked (founder, Sep 7 2026):** is the sample in `/blog/are-you-the-answer-ai-gives`
the same artifact the Day Pass `.docx` generates? If yes, one line fixes it. If not, rule again.

## Answer: no. It is a third thing.

The blog sample is a **hand-built HTML mock-up inside the blog page** for a fictional company,
"Meridian Payroll", with invented figures — 100% branded, 34% category win, a competitor
"PayNorth" cited 14×, "LedgerLine" 11×. It carries a prominent label:

> "SAMPLE REPORT · illustrative example — figures are representative, not measured. Your report
> is generated from your live data."

There are three distinct artifacts in play, and none is the blog mock-up:

| Artifact | Generator | Who can get it |
|---|---|---|
| AEO Analysis Report `.docx` | `src/services/docxGenerator.ts` | Day Pass and above |
| Citation Sweep report (`.docx` / `.md`) | `src/services/sweepDocx.ts` | any paid sweep |
| "AI Visibility Executive Report" `.md` | `scripts/exec-report.ts` + `src/lib/execReport.ts` | **admin / courtesy only — not purchasable** |

So the blog page names a product by a name that maps only to an admin-side generator. The one-line
fix the founder pre-approved does not apply, because the sentence it would have to say is not true.

## A second, separate problem on the same page

The mock-up contains the telemetry claim that was removed from the pricing page and the landing
page on Sep 7 2026:

> "One thing you can't see yet: which AI crawlers actually read your site. That telemetry is a
> one-line install — and the fastest way to confirm the fixes below are pulling the engines back
> to you."

There is no one-line install. This is the same undeliverable promise, still live, on an indexed
page. **It should come off regardless of how the naming question is ruled** — it is not a
positioning choice, it is a claim we cannot meet.

## Options, for the founder to rule

**Option A — rename the artifact to what ships.** Change "AI Visibility Executive Report" to
"AEO Analyzers report" or "Citation Sweep report" throughout the blog page, blog index, and
`llms.txt`. The mock-up stays as an illustration of a real deliverable. Lowest effort, no product
work, nothing over-promised.

**Option B — keep the name and ship the product.** Make the executive report purchasable, which
is WO-AEO-EXECREPORT-001, currently parked behind the freeze. Then the page is accurate as
written. Highest effort; a v1.9-class decision, not a copy fix.

**Option C — keep the name as a Business-tier deliverable.** If a Business Authority customer can
request the exec-report generator's output as a serviced deliverable, one sentence makes the page
true: *"The executive report is produced for Business Authority customers on request."* This is
only honest if the human review step actually happens for every one.

**Recommendation: A now, B later.** A removes the mismatch today at zero risk, and does not
foreclose B. C creates a manual obligation that will be missed under load.

## Draft copy for Option A (not shipped)

Replace, in `public/blog/are-you-the-answer-ai-gives/index.html`, the blog index card, and
`public/llms.txt`:

- "AI Visibility Executive Report" → **"AEO Analyzers citation-sweep report"**
- "That's what an AEO Analyzers Executive Report fixes." → **"That's what an AEO Analyzers
  citation sweep fixes."**
- Delete the telemetry paragraph quoted above entirely. Do not replace it with a softer version;
  there is no true version of it today.
- Keep the SAMPLE label exactly as it is. It is doing its job.

## One note on the invented figures

The mock-up's numbers are fabricated for a fictional company and clearly labelled as
representative. That is defensible as a marketing illustration and it is not generated output a
customer would paste. Flagging it rather than escalating: if the page is edited for any other
reason, consider rebuilding the mock-up from a real, consented sweep so the illustration is
measured rather than representative — that would be more on-brand for a measurement-honesty
product than a label is.

---

## Packaging decision — parked, ready for when the review is not just you (founder, Sep 7 2026)

`scripts/exec-report-stored.ts` now renders an executive report from any stored sweep at zero
marginal cost. That puts the artifact one step from purchasable. **Ruling: keep it internal until
the human review has a person other than the founder.** Recorded here so the decision is ready
rather than re-derived.

**The review obligation is the whole cost, and it is per order.** Every report that leaves the
building must be read by a human before it does, because the narrative prose is model-written even
though every number is computed. The generator's own header says so, and `containsGrayHat` is a
backstop, not a reviewer. Any option below that skips this is not on the table.

| Option | What it needs | The obligation it creates | Honest read |
|---|---|---|---|
| **A · One-time purchase** | a Stripe product, a delivery path (email or a signed download), an order queue, a refund policy | **a human review per order, at unpredictable times, with a delivery promise attached** — 48h delivery was the original spec, which means someone is on the hook on a Saturday | Highest revenue per unit, highest chance of a missed promise. Do not ship while one person is the queue. |
| **B · Business-tier deliverable on request** | one sentence on the pricing page, a request path, the same review | the same per-report review, but **demand is bounded by the subscriber count** and there is no delivery-time promise unless we make one | Cheaper and safer. Still a manual obligation, and "on request" quietly becomes an SLA the first time someone waits a week. |
| **C · Internal only (current)** | nothing | none | The published sample and the courtesy pack are produced by it; the blog's availability sentence already tells a reader to ask. |

**The trigger to revisit:** a second person who can run the review, or a review step that is a
queue with a visible backlog rather than an inbox. Until one of those exists, A and B both convert
a $0-marginal-cost artifact into an unbounded personal commitment — the same shape as every
silent-failure lesson in the cross-app file, except the thing that fails quietly is a person.
