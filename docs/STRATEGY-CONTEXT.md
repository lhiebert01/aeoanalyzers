# AEO Analyzers — Strategy Context (continuity, this repo)

> **Not a ledger.** Single source of truth for identity/distribution state is
> `OUTREACH-IDENTITY-STATUS.md` in the **thesmartaiworker-site** repo (maintained
> by the identity-site session). This file only records decisions that land in
> THIS repo's code/build. (Created 2026-07-31 — it did not previously exist here.)

## Numbering convention for published content (2026-07-31)

**Narrative numbers cite the stored baseline with its date; live numbers appear only
in live dashboards.** A blog/social claim is a snapshot that belongs to the story's
moment — anchor it (e.g. "98% branded retrievability across the stored runs", "265
crawls in the thirty days to July 31") and cite the reproducible baseline of record
(`docs/baselines/`), never the ever-drifting live value. The live number (e.g. 270
crawls now) lives in the dashboard, not the story.

## Identity / distribution decisions that bind this repo

- **PIGENAI LLC legal + postal address (CONFIRMED by founder 2026-07-31, use verbatim
  in email footers):**
  `PIGENAI LLC · 5901 NW 63rd Ter, Apt 301 · Kansas City, MO 64151`
  This is a **valid CAN-SPAM postal address as-is**; no virtual mailbox / registered
  agent is being set up (**policy: no new subscriptions**).
- **Email-template requirement (courtesy-sweep / report send path):** outbound
  report emails are **commercial mail**. Any send-path template MUST carry, in the
  footer: (1) the PIGENAI LLC postal address above, and (2) a simple opt-out line.
  Nothing is auto-sent — human review gate; admin sends manually from their own
  client (per WO-AEO-EXECREPORT-001 Phase 4 hard rule).

## Current build state (AEO measurement loop) — WO-QA-003 COMPLETE, FROZEN 2026-07-31

- Lane A (A1 truncation, A2 model-prior, A3 N+confidence) ✅ shipped + dogfood-verified.
- Lane B (B1 fidelity on branded answers, B2 entity-linking collisions) ✅ shipped + verified.
- Lane C (C1 competitor detection, C2 attainability tiers, C3 ICP segmentation) ✅.
- Lane E (E1 PAWC, E2 fact-density auditor, E3 llms.txt generator) ✅ — the freeze set.
- Courtesy-sweep generator + N=5 baseline + blog ✅. See `FREEZE-REPORT-2026-07-31.md`.
- Two dogfood false positives fixed (own-org founder flag; vertexaisearch authority) ✅.
- **FEATURE FREEZE in effect** — bug fixes + paying-customer blockers only until it lifts.

## Backlog (post-freeze unless a paying customer requires it)

- **Wire `factClassification.ts` four-way split (stale/conflated/fabricated) into
  sweep fidelity output** — Lane-B enhancement, post-freeze unless a paying
  customer's report requires it. When wired, the blog's Layer 2 may be upgraded to
  the four-way language (currently: "accurate, drifted from the facts, or confused
  with another entity entirely").

## Next — FROZEN. Product is in maintenance mode; founder time is on GTM-90 outbound.
(History below kept for the record; all items shipped 2026-07-31.)

## Was next, in order (per founder direction 2026-07-31) — ALL DONE

1. **Courtesy-sweep generation path — build FIRST** (before C2/C3). Target ~Aug 20:
   one command turns a domain into a review-ready report + email draft with the
   refined competitor list. **GREEN-LIT 2026-07-31: minimal generator only** (NOT
   full WO Phase 1–5): (a) versioned template + COURTESY watermark variant, (b)
   narrative generator — numbers injected from sweep JSON, model authors only prose,
   gray-hat blocklist on output, (c) email draft wrapper — DRAFT-ONLY forever, admin
   copies to mail client, footer = confirmed postal address + opt-out line (prose is
   placeholder; final wording comes in a later template session), (d) headless
   completeness so scorecard/fidelity/entity-linking compute server-side. Stripe
   door / review-queue UI / CRM deferred (outreach is manual copy-paste through GTM-90).
   Spec: `templates/exec-report/` (WO-AEO-EXECREPORT-001).
2. **N=5 self-sweep baseline** re-measure (now unblocked) — store it; it gates all
   public claims + the honest-zero series.
3. C2 (attainability tiers) → C3 (ICP segmentation) → Lane E → feature freeze.
