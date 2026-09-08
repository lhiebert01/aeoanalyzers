# Three audits before the September post — results. No draft written.

**Sep 7 2026.** Requested by the founder ahead of a Sep 12 publish. All three run against stored
data. **One returns a correction, one returns "unverifiable", one confirms.**

---

## A · Branded retrievability under the corrected rule

**Method.** Re-scored the stored branded runs with `scoreRun` as it ships today, which applies the
`searchRanSiteNotFound` correction. Compared against the figure stored at the time.

| Baseline | N | As stored | Corrected | "search ran, site not found" flags |
|---|---|---|---|---|
| **Jul 31 launch baseline** (source of the published 98%) | 40 | 98% | **cannot be recomputed** | — |
| **Aug 1 series anchor** | 40 | 100% | **100% — no change** | 0 |
| **Sep re-measure** | 40 | 82% (33/40) | **80% (32/40)** | **8** |

### A1 — The July 98% cannot be recomputed, and that is the finding

`docs/baselines/aeoanalyzers-N5-2026-07-31.json` is a **summary only**. It records
`runCount: 240` and `brandedRetrievabilityPct: 98` but contains **no transcripts**. I also checked
every stored sweep for aeoanalyzers.com in the database: the largest is 84 runs, and none is the
240-run headless baseline. **The raw answers behind the published 98% no longer exist.**

So the honest position is not "98% is right" or "98% is wrong" — it is **unverifiable**, and a
company that sells reproducibility should say so rather than defend the number.

**Indirect evidence, offered as evidence and not as proof:** the Aug 1 anchor is the same domain,
the same panel, ten days later, and it scores 100% under *both* rules with **zero** site-not-found
flags. The correction fires when an engine says it cannot find the site; nothing was saying that
about aeoanalyzers.com in early August. It is therefore likely, though not demonstrable, that July
was unaffected.

### A2 — The September figure DOES move, 82% → 80%

Eight of forty branded runs now score as "search ran, site not found". That is Claude's regression
arriving, and it is exactly the pattern the correction was built for. **This needs a correction
note, and the September post must use 80%, not 82%.**

### A3 — Recommendation

Add a dated note to `/blog/i-scored-zero` that says both things plainly: the September figure is
80% under the corrected rule, and the July figure predates transcript retention so it cannot be
re-derived. Draft:

> **Note, September 8 2026.** Two corrections to the measurement, both found by our own checks.
> A scoring rule was fixed in September: an engine that runs a search, fails to find the site and
> says so was previously counted as a mention. Under the corrected rule the September branded
> figure is 80% of 40 runs, not 82%. Separately, the July figure of 98% was recorded before we
> retained transcripts, so it cannot be re-derived under the corrected rule and should be read as
> the original measurement rather than a reproducible one. Every figure published since August 1
> has its transcripts stored.

---

## B · Does the beacon defect overlap the July crawler figure?

**The visible defect window does not overlap July.** The telemetry's first row is **Jul 22**; the
fourteen consecutive days with zero rows run **Aug 19 → Sep 1**. July is outside it.

**But the defect was present from the instrument's first day.** The beacon was fired as a bare
un-awaited `fetch` with no `waitUntil` from the moment the middleware shipped, so writes could be
dropped whenever the runtime ended an invocation early. The fourteen-day blackout is the visible
symptom of a fault that was always there. **Intermittent loss during July cannot be excluded.**

**No independent cross-check is available.** Vercel's runtime logs retain roughly the last hour,
so there is no July edge log to reconcile against. I checked rather than assumed.

**Direction of the error: undercount.** A dropped write can only lose a crawl, never invent one.
So 265 is a **floor**.

**Combined with the window error already found**, the honest form of the July figure is:

> at least 265 AI-crawler visits over the ten days from July 22 to July 31

not "265 visits in the thirty days to July 31". Both corrections point the same way — the crawl
rate was higher than published, not lower.

**Recommendation:** the September post should not restate the July crawler figure at all. If a
crawler number is wanted, the only clean window is Jul 22 – Aug 18, and it must be labelled as a
floor.

---

## C · Is the corpus contraction genuine? Yes, and it is larger than stated

**Method.** Both months processed by identical code: category runs only, every source URL reduced
to its registrable host, lower-cased, `www.` stripped.

| | Aug 1 | Sep | Change |
|---|---|---|---|
| Category runs | 200 | 200 | — |
| **Runs that returned any sources** | 187 | 184 | −1.6% |
| **Total source URLs cited** | 1,965 | 1,379 | **−30%** |
| **Distinct hosts, including the Gemini wrapper** | 296 | 215 | **−27%** |
| **Distinct hosts, excluding the Gemini wrapper** | 295 | 214 | −27% |
| Gemini grounding-redirect URLs | 262 | 278 | +6% |

**It is not a counting artefact.** Three checks rule that out:

1. **The Gemini exclusion is not the cause.** Removing `vertexaisearch.cloud.google.com` changes
   the count by exactly **one** in each month. The contraction survives with or without it.
2. **It is not fewer grounded answers.** 187 runs returned sources in August and 184 in September
   — essentially flat. The same number of answers cited 30% fewer URLs.
3. **The host reduction is applied identically to both.** Same function, same run, no panel change
   between the two: the pinned question set is the same v1.1 panel at reps=5.

**So the claim survives a reader recomputing it.** The engines cited roughly the same number of
grounded answers from a materially smaller set of sources.

**One precision the post must get right.** The cleared figure "0 of 215" uses the count *including*
the Gemini wrapper. With the stated exclusion applied it is **0 of 214**. Pick one and define it in
the post, because a reader who recomputes will land on 214.

---

## Summary for the founder

| Audit | Result | Consequence for the post |
|---|---|---|
| **A** | September branded is **80%, not 82%**. July's 98% is **unverifiable** — no transcripts survive. | Use 80% with N=40. Add the dated note to `/blog/i-scored-zero`. |
| **B** | No overlap with the visible blackout, but the defect predates July, so 265 is a **floor**. No edge logs survive to cross-check. | Do not restate the July crawler figure. |
| **C** | **Genuine.** −30% source URLs, −27% distinct hosts, grounded-answer count flat. | Claim stands. Say 0 of 215 or 0 of 214 and define which. |

**Not drafted, per instruction.** Ready to write on your word, with the corrected numbers and the
Sep 9–11 referring-domain delta once that block completes.
