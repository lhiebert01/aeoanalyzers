# AEO Analyzers — Strategy Context (continuity, this repo)

> **Not a ledger.** Single source of truth for identity/distribution state is
> `OUTREACH-IDENTITY-STATUS.md` in the **thesmartaiworker-site** repo (maintained
> by the identity-site session). This file only records decisions that land in
> THIS repo's code/build. (Created 2026-07-31 — it did not previously exist here.)

## Identity / distribution decisions that bind this repo

- **PIGENAI LLC legal + postal address:** `5901 NW 63rd Ter` (Kansas City, MO —
  confirm exact city/state/ZIP against the identity-site SSOT before it goes in an
  email footer). This is a **valid CAN-SPAM postal address as-is**; no virtual
  mailbox / registered agent is being set up (**policy: no new subscriptions**).
- **Email-template requirement (courtesy-sweep / report send path):** outbound
  report emails are **commercial mail**. Any send-path template MUST carry, in the
  footer: (1) the PIGENAI LLC postal address above, and (2) a simple opt-out line.
  Nothing is auto-sent — human review gate; admin sends manually from their own
  client (per WO-AEO-EXECREPORT-001 Phase 4 hard rule).

## Current build state (AEO measurement loop)

- Lane A (A1 truncation, A2 model-prior, A3 N+confidence) ✅ shipped + dogfood-verified.
- Lane B (B1 fidelity on branded answers, B2 entity-linking collisions) ✅ shipped + verified.
- C1 competitor detection refined (named-in-text rivals + display names) ✅ (`65a6a58`).
- Two dogfood false positives fixed (own-org founder flag; vertexaisearch authority) ✅.

## Next, in order (per founder direction 2026-07-31)

1. **Courtesy-sweep generation path — audit + build FIRST** (before C2/C3). Target
   ~Aug 20: generate a clean, sendable prospect sweep in minutes with the refined
   competitor list. Spec: `templates/exec-report/` (WO-AEO-EXECREPORT-001).
2. **N=5 self-sweep baseline** re-measure (now unblocked) — store it; it gates all
   public claims + the honest-zero series.
3. C2 (attainability tiers) → C3 (ICP segmentation) → Lane E → feature freeze.
