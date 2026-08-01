// WO-UX-CLARITY-001 — analyzer input safety.
//
// A live founder miss: entering `analyzers.com` (not aeoanalyzers.com) produced a
// confident 0/100 verdict on the WRONG domain. A confident verdict about the wrong
// site is a fidelity failure in our own product. This is the deterministic guard:
// when every subscore is 0 the result is almost always "the page returned no
// analyzable content" (parked domain, JS wall, wrong URL) — not a real zero — so we
// surface a sanity banner instead of a confident verdict.
//
// (The fuzzy "did you mean {prior brand}?" near-miss check against the session's
//  analyzed brand is a larger piece — session domain history + fuzzy match + UI —
//  logged to backlog; this all-zeros banner covers the demonstrated miss.)

export interface ScoreBreakdownLike { entity: number; density: number; clarity: number; structure: number; }
export interface AnalysisLike { score?: number; scoreBreakdown?: ScoreBreakdownLike | null; }

/** Verbatim banner copy (founder-ratified). */
export const ALL_ZERO_BANNER =
  'Every subscore is 0 — this usually means the domain returned no analyzable content. Verify the URL.';

/** True when the analysis is an all-zeros result (no analyzable content signal). */
export function isAllZeroAnalysis(r: AnalysisLike | null | undefined): boolean {
  if (!r) return false;
  const b = r.scoreBreakdown;
  if (b) return [b.entity, b.density, b.clarity, b.structure].every((v) => (v ?? 0) === 0);
  return (r.score ?? -1) === 0; // no breakdown to inspect → fall back to overall 0
}
