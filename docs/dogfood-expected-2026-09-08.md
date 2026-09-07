# Dogfood grading key — sealed 2026-09-08

**This file is the grading key for Run 1 (gap audit, Sep 9) and Run 2 (acceptance test, Sep 15)
of QA-DOGFOOD-RUNBOOK-001.**

**Sealed before any change to report-generating code**, per Step 0 of the runbook. If the
acceptance list is written after the build, it drifts to match what got built.

**This file does not change after this commit.** A later discovery is appended in a **separate
commit**, dated, and labelled as an addition. **No existing line is ever edited.** If a value
below turns out to be wrong, the correction is appended, not substituted, so the record shows
what was expected at sealing time and what was learned afterwards.

---

## The eight expected findings — verbatim from WO-AEO-FIX-LIST-001 §7

The rebuilt report, pointed at `aeoanalyzers.com` **with no hints**, must surface each of these
unaided:

- [ ] two or more routes serving a byte-identical copy of the homepage (A2)
- [ ] the sitemap declaring non-pages and omitting real pages (A3)
- [ ] the `sameAs` identity merge between aeoanalyzers.com and pigenai.com (A6)
- [ ] 4 internal links across 7 served documents, with the orphan pages listed (B1, B2)
- [ ] 5 referring domains, 0 editorial, 6 nofollow, 2 self-owned (C3)
- [ ] anchor text 100% bare URL (C3d)
- [ ] corpus presence 0 of 215, with N and date (C1)
- [ ] a Fix List whose top item is a Layer 0 blocker, not a schema suggestion

**Pass condition:** all eight. *"If it misses any of these, it is not done. Anything it misses on
the site we understand best, it will miss on every customer site."*

**Second case:** then run against one Lantern Post stored sweep and report the diff in what each
report surfaces.

---

## Reference values, as known at sealing time

Recorded so a grader can check a claim without re-deriving it. Each carries its source.

| Finding | Reference value at sealing | Source |
|---|---|---|
| A2 duplicate routes | `/pricing`, `/guide`, `/privacy`, `/terms` all served the same document as `/` (58,567 bytes, identical `<title>`); `/press`, `/evidence`, `/methodology` likewise and are not pages at all | `docs/EDGE-AND-CRAWLER-CHECKS-2026-09-07.md`, live byte/title check Sep 7 |
| A3 sitemap | Declared 5 non-pages (`/analyzer`, `/guide`, `/press`, `/privacy`, `/terms`) and omitted 4 real blog pages | `public/sitemap.xml` before the Sep 7 rewrite |
| A6 sameAs merge | Organization node declared `sameAs: ['https://pigenai.com', 'https://pigenai.com/#org']`; SoftwareApplication declared `sameAs: ['https://pigenai.com']` | `src/lib/json-ld.ts` before Sep 7; removed in `01f5303` |
| B1/B2 internal links | 4 internal links across 7 served documents, orphan pages listed | founder, from manual `curl`, Sep 7 |
| C3 referring domains | 9 external links · 5 referring domains · 0 editorial · 6 nofollow · 2 self-owned · 1 automated tool page | Google Search Console Links report, Sep 7 |
| C3d anchor text | 100% bare URL | same |
| C1 corpus presence | **0 of 215** as stated in the WO. **Note, same day:** the audit found 215 counts the Gemini grounding wrapper; on the founder-ruled basis that excludes it the figure is **0 of 214** (Sep) and **0 of 295** (Aug). Either is acceptable in Run 1 provided the report states its basis. | `docs/SEPTEMBER-POST-AUDITS-2026-09-07.md` §C |
| Fix List ordering | Top item must be a Layer 0 blocker, not a schema suggestion | WO §7 |

---

## Grading rules

1. **Blind.** The agent that builds the checks does not decide whether the report surfaced them.
   The founder grades, as customer proxy.
2. **A row is Present only if a cold read of the report would have told you.** A finding buried in
   a transcript, or implied by a number without being named, is Absent.
3. **Absent is a coverage gap, not a verdict on the measurement underneath.** Layer 3 — what the
   engines actually say — is not under test here and did its job this week.
4. **The reference values above are the state at sealing.** Several defects were already fixed on
   Sep 7. A report that does not find a fixed defect is correct, not failing — Run 1 grades
   whether the report *can detect this class of defect*, which is testable against the fixed and
   unfixed alike by pointing it at the recorded prior state.

## Sealing record

- Sealed: **2026-09-08**
- Sealed by: aeo-app1 session, on founder instruction (QA-DOGFOOD-RUNBOOK-001 Step 0)
- Report-generating code at sealing time: unchanged since `0360dcf`
- Commit hash of this file: recorded in the close-out immediately below the commit

---

# APPENDED 2026-09-08 — corrections and additions

**Appended, never edited.** Every line above is the record as sealed at `29c4645`. Corrections
are added here so a grader can see both what was expected at sealing and what was learned after.

## Correction 1 — corpus presence denominator: 0 of 215 → **0 of 214**

The sealed acceptance list carries row 7 as **0 of 215**, taken verbatim from WO-AEO-FIX-LIST-001
§7 as it read at sealing time. **That figure is superseded.**

WO-AEO-FIX-LIST-001 was revised the same day: §4 C1 and §7 now read **0 of 214 (Sep)** and
**0 of 295 (Aug)**. The earlier 215 and 296 were computed **including** Gemini's
grounding-redirect wrapper, while the plan text claimed they excluded it. The audit was right and
the plan was wrong. Excluding the wrapper removes exactly one host per month, so both months now
read on the same basis and the shape of the contraction claim is unaffected.

**Grading rule for row 7, effective now:** the report passes if it reports corpus presence with
its N and date **and states which basis it used**. Either 214 or 215 is acceptable provided the
basis is stated; a figure with no stated basis fails, because a reader recomputing it will land
on 214.

Source: `docs/SEPTEMBER-POST-AUDITS-2026-09-07.md` §C · WO-AEO-FIX-LIST-001 §4 C1, rev 3.

## Addition 1 — the acceptance fixture is pinned (runbook Step 0b)

Runbook rev 2 added Step 0b after sealing. Three of the eight rows had their ground truth
repaired by the Sep 7 emergency work, so a run against the live site returns no signal on them
and nothing distinguishes "the check is missing" from "the defect is gone".

**Fixture commit: `9a53404`** — the last commit before any of the three repairs. Verified to
serve all three defects intact:

| Row | Defect | Verified on the fixture |
|---|---|---|
| 1 | duplicate routes | `/`, `/pricing`, `/guide`, `/terms` all serve **58,567 bytes** — one document at four URLs |
| 2 | `sameAs` identity merge | Organization: `["https://pigenai.com","https://pigenai.com/#org"]` · SoftwareApplication: `["https://pigenai.com"]` |
| 3 | sitemap declaring non-pages | `/analyzer`, `/guide`, `/press`, `/privacy`, `/terms` listed; four real blog pages omitted |

**Both Run 1 and Run 2 grade against this fixture.** The live site is a separate, second run that
answers whether the repairs held; its results are never substituted for the fixture's.

**Origin note.** The fixture is served from a build of `9a53404`. A Vercel preview deployment was
created (`fixture-bwm0prvx7`) but the project has Vercel Authentication enabled for all
non-custom domains, so preview URLs return 302 to a login and are not fetchable by a report.
**That setting was left untouched** — disabling it would expose every preview deployment, which is
a security-posture change for the founder to make, not the agent. Until the founder either
disables it or issues a protection-bypass secret, the fixture is served locally from the pinned
commit, which satisfies real-origin, fetchable, reproducible and hash-pinned.

## Addition 2 — the standing practice this implies

**Capture a fixture at the moment a defect is discovered, before the fix ships.** Every defect
repaired before its detector exists is a test case lost, and the loss is invisible until someone
tries to grade the detector. A finding is not closed until either the detector exists or a fixture
is pinned. Recorded here because this run nearly lost three of eight rows to it.
