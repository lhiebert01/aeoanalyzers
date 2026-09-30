# QA plan — spot checks for the Sep 30 2026 release (step by step)

Everything below is live on production. Work top to bottom; each step says what to open,
what to look for, and what "pass" means. If anything differs, screenshot it and send it — it
is a defect, not a judgment call. Nothing here spends engine money: every check uses the
saved Nybsys sweep and the saved Nybsys score.

## Part 1 — Citation Sweep (saved view, $0)

Open **History → Citation Sweeps → View** on the Nybsys row (Sep 30).

1. **Executive summary card at the top.** Pass: a card titled "Executive summary" with three
   big numbers (Found when asked by name 100% · Recommended to new buyers 0% · Your own site
   cited as the source 100%), a bar block by buyer segment, "Who got named instead" with
   Ericsson 14 / Nokia 12 / Celona 11 at the top, a "What this means" paragraph that says
   *recommendation gap, not a discovery gap*, and "Do these three things first".
2. **Plain labels first.** Every metric shows the plain label in bold with the precise name
   beneath it (e.g. "Found when asked by name" over "Branded retrievability"). Pass: no tile
   or engine card shows the technical name first. The words "Pick Rate" appear nowhere.
3. **Cited instead.** Pass: eleven vendors, Ericsson and Celona carry a "seeded" tag, the
   rest do not.
4. **Entity-linking card.** Pass: nybsys-mwc.com is NOT listed as a collision; an "Owned
   properties: nybsys-mwc.com" line is shown.
5. **What the engines believe about you.** Pass: a table under Fidelity with San Jose,
   California from four engines (Consistent), Moshtaq Ahmed (Consistent), Founded 2006 from
   ChatGPT only (Single-source). Statuses are only Consistent / Single-source / Conflicts.
6. **What to do.** Pass: opens with "**You have a recommendation problem, not a discovery
   problem and not an accuracy problem.**" Not "accuracy problem".
7. **Do-now checklist** at the end of the action section. Pass: each domain carries its
   count and engines, e.g. "sourceforge.net (7 citations, Claude + Perplexity)".

Downloads (same screen, the three buttons):

8. **Download report (Word).** Open it. Pass: page 1 is the executive summary alone (title,
   three tiles, bar block, named-instead, what this means, three actions); page 2 starts
   "What AI believes about you"; then "Where you win and lose" with a segment table that has
   "Recommended (prominent)" and "Mentioned" columns (0 and 0 on every row) and a footnote;
   "Who got named instead"; "Sources the engines trust"; a page break before "Action plan";
   a page break before "Methodology"; a page break before "Appendix — transcripts (48 runs)".
   The heading "What to do about these results" no longer appears twice. Tables have a shaded
   header row.
9. **Markdown.** Open in any viewer. Pass: same sections in the same order; the cover's
   numbers match the Word file exactly.
10. **Download PDF.** A new tab opens and the print dialog appears with the filename
    `citation-sweep-Nybsys.com-2026-09-30`. Choose "Save as PDF". Pass: page 1 is the cover;
    numbers match the Word file. **iPhone Safari:** same button → print sheet → share icon →
    Save to Files. If a pop-up blocker stops it, the screen says so; allow pop-ups and retry.

## Part 2 — AEO Score (saved analysis, $0)

Open **History → Analyses → View** on nybsys.com (Sep 30), then the roadmap's **Summary** tab.

11. **Executive summary card** above "Executive Summary". Pass: How citable your site is
    61/100 · Chance a page like this gets cited 58% · Weakest dimension Factual density 45/100;
    a bar block with the four dimensions (75 / 45 / 60 / 65); "What this means" names factual
    density as the drag and "verifiable facts on the page" as the fix; three actions.
12. **Download Report (Word).** Pass: page 1 is that same cover; page 2 begins "Executive
    Summary"; "What Your Score Means", "What is JSON-LD" and "Why This Matters" now sit AFTER
    "Full Recommendations" and before Appendix A; major sections start on a new page.

## Part 3 — the blog post

13. Open https://aeoanalyzers.com/blog/one-question-is-not-a-measurement. Pass: the hero image
    is the empty-grid render (no gauges), the page is indexable (no "noindex" in view-source),
    the blog index shows the card, and the primer's "Next read" link points here.
14. Paste the URL into LinkedIn's post composer (do not post). Pass: the preview card shows the
    "One question is not a measurement" image.

## Part 4 — the POSSE pack

15. `Downloads/POSSE-PACK-one-question-2026-09-30.docx`. Pass: LinkedIn, Facebook, X thread,
    Bluesky (under 300 characters), Medium/Substack teaser + canonical instructions, Reddit
    (gated), notes. Names no vendor and no practitioner.
