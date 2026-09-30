# WO-AEO-REPORT-POLISH-001 — Report polish and gap fixes

FOR THE AEO-APP1 SESSION

Issued: 2026-09-30 by Lindsay Hiebert (founder). Revised 2026-09-30 evening: Lane C expanded to executive summary + formatting for both reports; nybsys-mwc.com ownership confirmed.
Repo: aeoanalyzers.com (Vercel project prj_bV4G85yj3kQRujkcvTAvwhNMzpqW, prod branch main)
Origin: 2026-09-30 Nybsys.com Citation Sweep + AEO Score, compared side by side with a competitor's report on the same domain (private, in reference/)

## 0. Freeze status and how this WO runs

- The product is in GTM-90 maintenance mode until 2026-11-01 (bugs + paying-customer blockers only).
- Lanes A, B and G below are classified as measurement-integrity bugs and may ship now under the standing freeze exception for integrity fixes (same class as the truncation and errored-run fixes).
- Lanes C, D, E and F are report polish. Build them on branch `report-polish-oct` behind a review gate (SSO-gated Vercel preview). Do not merge to main before 2026-11-01 unless the founder replies "go" to the plain yes/no question in section 6.
- No wake words. Dated work runs on its date. Founder stops work with "hold".
- Standing close-out rule applies to every lane: no ✅ without (1) external cache-busted fetch proof, (2) Vercel deployment ID, (3) commit hash. Repo state is not production state.
- Grounded rule applies to every report change: every number in a report is injected from stored sweep data, never model-authored.
- Service boundary ruling stands: nothing in this WO adds implementation, editing or support of customer websites.

## 1. Why this WO exists (one paragraph)

The 2026-09-30 Nybsys sweep is correct but under-reports what it knows. The cited-instead table shows only the two seeded competitors while the stored transcripts name at least seven other vendors. Fidelity reports "8 got your facts right" without showing the facts. The report opens well and then becomes dense. A competitor's report on the same domain, built on a far weaker method (one question asked four ways, three engines, one run, no sources), is easier for a buyer to read because it leads with two numbers, one chart and a short human paragraph. This WO closes the reporting gap without touching the measurement method.

## 2. Reference assets (in reference/)

- `citation-sweep-Nybsys_com-2026-09-30.docx` — the sweep this WO is graded against. Saved sweep exists in the DB for lindsay's account, domain nybsys.com, 2026-09-30 ~18:42 UTC.
- `AEO-Report-nybsys_com-2026-09-30.docx` — the AEO Score report from the same day (61/100).
- `COMPETITOR-REPORT-lefty-media-nybsys-2026-09-16-PRIVATE.pdf` — competitor report. PRIVATE. Use only to understand what readable looks like. Do not copy wording, layout, colors, the term "Pick Rate" as a product name, or any branding. Do not commit this file to the repo. Delete it from the container when the WO closes.

## 3. Lanes

### Lane A — Cited-instead: count every named vendor, not just seeds (integrity bug, ship now)

Problem: `Cited instead of you` lists Ericsson 12× and Celona 10× only. Transcripts for the same sweep name Nokia, CommScope, Cisco, Mavenir, Samsung, Kajeet, Verizon Business, Boingo, Wilson Connectivity, Juniper, Huawei, ZTE. The table is only counting seeded competitors (or only counting when a seed is present).

Build:
1. Extract every vendor entity named in each category answer (search-grounded AND model-prior; tag which). Reuse the existing C1 real-competitor extraction and listicle-pollution filter; do not build a second extractor.
2. Rank by count. Mark seeded competitors with a "seeded" tag. Show top 10, with an expandable full list in the saved view.
3. Resolve each vendor to a domain from the answer's own sources or the vendor's canonical site. Where no confident domain, show the name with no domain. Never invent a domain. (A competitor's report on this domain listed Motorola Solutions at gomarketcap.com. That class of error is disqualifying for us.)
4. Filter junk: parts brokers, directories, marketplaces (justdial, alibaba, thomasnet, tradeindia, sourceready, accio) are sources, not competitors. Keep them in Authority Gap, out of Cited Instead.
5. Report and saved view and Download must show the same table (parity rule from WO-002).

Acceptance: regenerate the 2026-09-30 Nybsys saved sweep. Cited-instead shows at minimum Ericsson, Celona, Nokia, CommScope, Cisco, Mavenir, Verizon Business with correct counts derivable from the 48 stored transcripts. Prove-by-breaking test: one transcript that names an unseeded vendor, assert it appears.

### Lane B — "What AI believes about you" fact table (integrity gap, ship now)

Problem: Fidelity says "Of the answers that named you, 8 got your facts right" and shows nothing. The customer cannot see what the engines believe, and cannot see a wrong fact when one appears. A competitor's report displayed founder, founding year and HQ as extracted facts and that single section did more to earn trust than anything else in it.

Build:
1. From branded answers only, extract atomic claims about the entity: legal/brand name, HQ location, founder/CEO, founding year, product lines, customer segments, parent/affiliates. Reuse the existing fidelity classifier output (accurate/drifted/fabricated); this is a display of data already computed, plus a small claim-splitting step.
2. Render a table: Claim · Said by (engines) · Times · Status (Consistent across engines / Single-source / Conflicts). Do NOT label a claim "correct" or "wrong" unless the existing fidelity classifier already did so against a stored fact sheet; otherwise the status is about agreement between engines, which is what we can measure.
3. Under the table, keep the existing one-line fidelity summary.
4. Store the claim table in `citation_sweeps.full_result` (additive key `beliefs`), so the saved view reproduces it with no re-run.

Acceptance: Nybsys saved sweep shows a table including HQ San Jose CA (all engines), CEO/founder Moshtaq Ahmed, product lines (private 5G / small cells / IoT / security gateways). Saved view and Download match.

### Lane C — Executive summary and readable formatting, BOTH reports (polish, gated, PRIORITY of the polish lanes)

Founder direction (Sep 30): the docx reports for the AEO Score and the Citation Sweep must read like a document a CMO would hand to a CEO. Today they read like a log. The minimum is an executive summary at the top of each; the goal is a report that looks good throughout.

Build, for BOTH the AEO Score report and the Citation Sweep report (docx first, then md and results screen):

1. Page 1 = Executive summary, one printed page, in this order:
   - Title block: brand, domain, date, "Prepared by" as today.
   - Two or three headline numbers with a plain-English label and the precise label beneath (Lane F aliases). Score report: AEO Score, Citation Readiness, weakest dimension. Sweep report: Found when asked by name, Recommended to new buyers, Your own site cited.
   - One visual: a shaded docx table used as a horizontal bar block (segment wins for the Sweep; the four dimension scores for the Score report). No chart library; cell shading and widths only, so it renders everywhere.
   - "Who got named instead" top 5 (Sweep only, from Lane A).
   - A three-to-five-sentence "What this means" paragraph, template-driven and data-injected, never model-authored. Templates keyed to the diagnosis pattern (branded high/category zero; branded low; category > 0; Score: which dimension is dragging and what class of fix it implies).
   - "Do these three things first" — the top three actions already computed by the report, one line each, with the section they expand in.
2. Typography and layout pass across the whole document: consistent heading hierarchy, real docx table styles with header shading, key numbers bold, generous whitespace, no orphan single-line sections, page breaks before major sections. Transcripts move to an appendix after a page break with a one-line pointer from the summary.
3. Section order after the summary follows the reader's question, not the pipeline: What AI believes about you (Lane B) → Where you win and lose by segment → Who got named instead → Sources the engines trust → Action plan → Methodology one-pager → Appendix: transcripts.
4. Both reports share one summary component so the Score report and Sweep report look like siblings.
5. Existing content is preserved; nothing is removed, only reordered and re-set. Parity rule: docx, md, saved view and Download all agree.

Acceptance: regenerate the Nybsys 2026-09-30 Score report and Sweep report. Page 1 of each fits one printed page; every number traces to a stored field; founder reads page 1 and can state the diagnosis and first three actions without reading further. Screenshot both page 1s into the close-out.

### Lane D — Named vs recommended (polish, gated)

We already compute prominence-weighted answer share (PAWC, Lane E1). Surface it: in the segment table and Lane C cover, add "Recommended (prominent)" vs "Mentioned" split where PAWC data exists. Definitions from the existing E1 implementation; do not change the metric. Footnote: what counts as prominent.

Acceptance: Nybsys shows 0 / 0 (nothing to split), Lantern Post 2026-09-02 saved sweep shows the split populated for branded answers. No metric values change anywhere.

### Lane E — PDF download (polish, gated)

Add "Download PDF" beside the existing docx/md downloads. Server-side render from the same data the docx uses (single source, no second template). Pick the lightest route that works in the Vercel function budget (HTML → PDF via an existing dependency preferred; if none fits under the 300s/maxDuration and bundle limits, generate docx and convert; document the choice). Filename pattern `citation-sweep-<domain>-<date>.pdf`. Cover from Lane C on page 1.

Acceptance: PDF opens on iPhone Safari and desktop; page 1 = Lane C cover; byte-for-byte same numbers as docx of the same saved sweep.

### Lane F — Plain-English aliases (polish, gated, copy only)

Everywhere the report or screen shows a metric label, show the plain label first and the precise label second, per Lane C. Alias table (copy, not code):
- Retrievability → "Found when asked by name"
- Category citation win → "Recommended to new buyers"
- Owned citation rate → "Your own site cited as the source"
- Share of category → "Your share of the recommendations"
- Model-prior → "Answered from memory (no search)"
Do not use the term "Pick Rate". It is a competitor's coined term.

### Lane G — Two known leaks, fix while in the file (integrity, ship now)

1. Generic authority fallback: "This month's authority checklist" listed sourceforge.net, linkedin.com, trustpilot.com for Nybsys. Trustpilot was in this sweep's sources; sourceforge was not. Rule: Do-now checklist may only list domains that appear in THIS sweep's stored sources. If none qualify, say "No self-serve listings appeared in your sources this month" rather than showing a generic list. (Already logged in WO-002 Lane B; close it here.)
2. Near-name domain, same-owner exception: nybsys-mwc.com was flagged as an entity collision. FOUNDER CONFIRMED Sep 30: it is a Nybsys-owned prototype site the web team used while building nybsys.com. Add a founder-confirmable "this is ours" toggle per flagged domain on the results screen. When toggled, the report replaces the not-affiliated line with: "Owned property: <domain>. If it is a retired prototype, 301 it to your primary domain or add noindex; if it is live, link it into your @id graph as an owned property." The choice persists in `query_panels` config memory (P1-B) for that user+domain. Do not auto-decide ownership. Set the toggle ON for nybsys.com / nybsys-mwc.com in the founder's account as the first fixture.

## 4. Out of scope

- Any change to how citation win, retrievability, N, confidence, grounding split or errored-run exclusion are computed.
- Reps, concurrency, pricing, tiers, new engines.
- Anything on the gtm-drafts-aug13 branch (D-pages, /about, Part 3, Sept-1 posts).
- Copying anything from the competitor PDF.

## 5. Order of work and sizing (agent to confirm)

1. Lane A (~3 hrs) → 2. Lane G (~1.5 hrs) → 3. Lane B (~3 hrs) → checkpoint close-out on main with proof → 4. Lane C (~4 hrs) → 5. Lane F (~1 hr) → 6. Lane D (~1.5 hrs) → 7. Lane E (~3 hrs). Lane C is resized to ~6 hrs given its expanded scope and is the first polish lane built on branch `report-polish-oct`, gated.

Tests: one outcome test per lane, prove-by-breaking where a rule is added. Test count must not fall below 210.

## 6. Plain yes/no questions for the founder (defaults shown)

1. Ship Lanes C–F to production before 2026-11-01 when gated review passes? Default: NO (wait for freeze lift).
2. Is nybsys-mwc.com a Nybsys-owned property? ANSWERED Sep 30: YES, a retired prototype site owned by Nybsys. Treat as owned (Lane G).
3. Delete the competitor PDF from the container at close-out? Default: YES.

## 7. Close-out format

Per lane: commit hash · Vercel deployment ID · cache-busted fetch proof (bundle marker or served text) · test delta · one line on what changed for the Nybsys 2026-09-30 saved sweep. Then the three section-6 questions restated with the founder's answers or "pending".
