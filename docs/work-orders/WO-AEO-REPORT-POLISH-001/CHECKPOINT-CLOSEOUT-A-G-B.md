# WO-AEO-REPORT-POLISH-001 — checkpoint close-out, Lanes A · G · B (2026-09-30)

All three integrity lanes are live on production `main`. Lanes C–F are not started
and stay gated on the founder's plain "go" (default NO before Nov 1).

## Proof of record

| Lane | Commit | Production deployment | Bundle proof (external fetch of aeoanalyzers.com) |
|---|---|---|---|
| A — cited-instead counts every vendor | `1db165f` | `dpl_6aC1SLFB5kANLSyxz11kzwuDS6jy` | `/assets/index-SKLwPvyN.js` contains "Entered by you" |
| G — Do-now receipts · owned domain | `5b25f15` | `dpl_9hBGpecNgfyG6se1VqR9ys1eeEsm` | `/assets/index-Ce9OiAPa.js` contains "This is ours" |
| B — beliefs fact table | `209d9b8` | `dpl_9e94tMrDqrqjeUFwbFMRwMCKPpEq` | `/assets/index-1KKnTVxI.js` contains "What the engines believe about you" |

Test count: 537 before → **552 after** (≥ 210 required). `npx tsc --noEmit` clean; `npm run build`
passed the orphan check and the fail-closed prerender check on every lane.

## The Nybsys sweep, before and after (id `15ec76a6…`, 48 runs, 2026-09-30)

- **Cited instead (A):** was Ericsson 12 · Celona 10 (seeds only). Now Ericsson* 14 · Nokia 12 ·
  Celona* 11 · Cisco 8 · Cradlepoint 6 · CommScope 5 · Mavenir 4 · Verizon 4 · Boingo 3 · Corning 3 ·
  Kajeet 3 (* = entered by you). Every row carries the domain it was resolved from.
- **Do-now checklist (G1):** the order's premise was that sourceforge.net was not in the sweep's
  sources. It was — 7 citations, with linkedin.com 4 and trustpilot.com 3, all from category answers.
  The defect was the missing receipt and a one-engine bar. Now each entry prints its count and the
  engines that cited it, and a domain needs two engines or three citations. When nothing qualifies:
  "No self-serve listings appeared in your sources this month."
- **Owned domain (G2):** nybsys-mwc.com no longer appears as a collision once marked "This is
  ours"; the remediation says what to do with it (301 or noindex if retired; link into the @id graph
  if live) and the generator adds it as a `WebSite` published by the same organization.
- **Beliefs (B):** HQ San Jose, California — Claude, ChatGPT, Perplexity, Gemini (6, Consistent) ·
  Founder/CEO Moshtaq Ahmed (2, Consistent) · Founded 2006 (ChatGPT, Single-source) · product lines
  private 5G / IoT / small-cell / security gateways / AI-driven network management (Consistent).

## Deviations from the order, stated

1. **B — not persisted as `full_result.beliefs`.** The table is a deterministic function of the
   already-stored branded transcripts, recomputed on the live view, the saved view and both reports.
   A stored copy would only go stale, and deriving it means every earlier sweep gets the table too.
2. **G1 — the stated rule was already true.** Implemented the tighter, defensible rule above instead
   of restating the existing one.
3. **G2 — ownership persists on `citation_sweeps.owned_domains`,** not `query_panels`, because the
   app never writes `query_panels`; P1-B config memory reads the last `citation_sweeps` row.

## Founder actions

1. ~~Run the migration~~ **DONE 2026-09-30** — founder ran
   `20260930_wo_report_polish_owned_domains.sql` in the SQL editor; verified by SELECT: the Nybsys
   row `15ec76a6…` (created 2026-09-30 18:42 UTC) shows `owned_domains = ["nybsys-mwc.com"]`.
2. Open the saved Nybsys sweep and confirm the three sections read as above.

## Housekeeping

- The competitor PDF named in the order was never copied into the repo or the container
  (excluded at unzip); nothing to delete. Repo is public; no prospect data committed.
- `reference/` docx files stay untracked in the WO folder.
