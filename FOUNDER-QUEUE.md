# FOUNDER-QUEUE.md — device / eyes-on items only the founder can close

Acceptance is **observation, never attestation.** Some acceptance steps require a
real device or a human eye (iPhone screenshots, side-by-side visual diffs). The
agent ships the code, records the deploy id + external-fetch proof, and files the
observation step here. **No per-item pings** — the founder works this queue on
their own cadence.

Format: one checklist block per work order. Check the box when done; the WO is
not fully accepted until its boxes are checked.

---

## WO-AEO-MOBILE-HISTORY-001 — iPhone roadmap clip + Citation Sweep history parity

**Shipped to production:** `main` @ `91cfa7e` · deploy id recorded in the WO
close-out. Both parts live under the v1.1 GO / freeze exception.

Code-side proof already recorded by the agent (tsc clean · 206 tests · build
clean · production deploy id + external fetch). What remains is **device
observation** — only the founder can take these:

### Part A — roadmap tab/download clip on iPhone
- [ ] iPhone Safari, `/analyzer` results → **Implementation Roadmap** card:
      screenshot showing all three tabs (SUMMARY · HANDOFF · PLATFORMS) reachable
      and **DOWNLOAD REPORT full-width below the tab row, visible and tappable**
      at ≤480px. No clipping, nothing lost off-screen.
- [ ] Same check on `/sweeps` results header on iPhone.
- [ ] Desktop 1280px: confirm no visual change vs. before (pixel-diff / eyeball).

### Part B — Citation Sweep history parity
- [ ] Open the **Dolphinpools.us 8/21/2026** sweep from `History → Citation
      Sweeps` via the new **View →** link. Side-by-side vs. the original run:
      scores, per-engine table, cited-instead, authority gap, transcripts match.
- [ ] **Download report** from the saved view produces the report (B2).
- [ ] Transcripts **Show details** expands from the saved view (B3).
- [ ] The History row's cost still reads **$0.45** — proves no re-run / $0 (B1).
- [ ] iPhone + desktop 1280px screenshots of the saved-sweep view.

> Note (B4, not a defect): a saved view rebuilds from stored `citation_sweeps` +
> `sweep_results`. Point-in-time sections derived from a **live** site fetch at
> run time — fidelity (drift), entity-linking (collisions), content-depth
> (fact-density) — are **not persisted** and intentionally do **not** render in a
> saved view (not fabricated, not re-queried). Migration status: **NONE**.
