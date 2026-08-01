// WO-QA-003 C3 — Query-set ICP segmentation.
//
// A 0% category win on "best AEO software for ENTERPRISE brands" is not a failure
// for an SMB-priced self-serve tool — it's out-of-segment. Reporting one blended
// category-win number hides that. We tag every category query by buyer segment so
// the report can show win per segment and name the segment you can actually win.
//
// Deterministic + self-contained (no intra-lib imports, so it's safe to import
// anywhere, including a serverless route). Keyword heuristics, extensible.

import type { SweepRunResult } from './citationSweep';

export type QuerySegment =
  | 'branded'          // names you — retrievability, not a category contest
  | 'enterprise'       // large-org / at-scale framing (often out-of-segment for SMB tools)
  | 'smb-affordable'   // small business / startup / affordable / free
  | 'alternative-to-x' // "alternative to X" / "X vs Y" — displacement questions
  | 'use-case'         // "how to …" / "best … for <task>" — task-framed
  | 'general';         // broad category discovery

export const SEGMENT_LABEL: Record<QuerySegment, string> = {
  branded: 'About you (branded)',
  enterprise: 'Enterprise',
  'smb-affordable': 'SMB / affordable',
  'alternative-to-x': 'Head-to-head / alternatives',
  'use-case': 'Use-case',
  general: 'Category discovery',
};

/** Classify a query into a buyer segment. Order matters: the more specific framings
 *  (alternative-to, enterprise, smb) win before the generic use-case/general. */
export function classifyQuerySegment(query: string, queryType?: string): QuerySegment {
  if (queryType === 'branded') return 'branded';
  const q = ` ${String(query || '').toLowerCase()} `;
  if (/\balternatives?\b|\bvs\.?\b|\bversus\b|instead of|competitor(s)? to|switch from/.test(q)) return 'alternative-to-x';
  if (/enterprise|large (business|brand|compan|organi|team)|at scale|corporations?|fortune \d|mid-?market/.test(q)) return 'enterprise';
  if (/affordable|cheap|budget|low.?cost|\bfree\b|small business|small businesses|startups?|\bsolo\b|\bindie\b|\bsmb\b|for agencies/.test(q)) return 'smb-affordable';
  if (/how (to|do|can|should)|\bfor (tracking|monitoring|optimi|auditing|finding|managing)\b|best .*\bfor\b/.test(q)) return 'use-case';
  return 'general';
}

export interface SegmentStat {
  segment: QuerySegment;
  /** Grounded, non-truncated category runs in this segment. */
  categoryRuns: number;
  categoryCited: number;
  winPct: number;
}

/** Category-win broken down by buyer segment. Applies the same exclusions as the
 *  headline scorecard (truncated + model-prior runs don't count) — read straight
 *  off the run flags so this module stays import-free. */
export function segmentBreakdown(runs: SweepRunResult[]): SegmentStat[] {
  const by = new Map<QuerySegment, SegmentStat>();
  for (const r of runs) {
    if (r.queryType !== 'category') continue;
    if (r.truncated) continue;
    if (r.grounding === 'model-prior' || r.grounding === 'indeterminate') continue;
    const seg = classifyQuerySegment(r.query, r.queryType);
    const e = by.get(seg) || { segment: seg, categoryRuns: 0, categoryCited: 0, winPct: 0 };
    e.categoryRuns++;
    if (r.cited) e.categoryCited++;
    by.set(seg, e);
  }
  return [...by.values()]
    .map((e) => ({ ...e, winPct: e.categoryRuns ? Math.round((e.categoryCited / e.categoryRuns) * 100) : 0 }))
    .sort((a, b) => b.winPct - a.winPct || b.categoryRuns - a.categoryRuns);
}

/** The segment the brand is most winnable in (highest win, needs >= minRuns to
 *  count). null when nothing is winning yet — used to frame an all-zero result
 *  honestly ("no segment is winning yet") instead of as blanket failure. */
export function winnableSegment(stats: SegmentStat[], minRuns = 2): SegmentStat | null {
  const eligible = stats.filter((s) => s.categoryRuns >= minRuns && s.winPct > 0);
  return eligible[0] || null;
}

/** In an all-zero result, the non-branded losing segment carrying the most runs —
 *  the honest, data-derived thing to name in the summary line instead of a canned
 *  "enterprise-framed" claim that may reference a segment that isn't even present
 *  (WO-SWEEP-POLISH-002 B4). Returns null only when there is no losing category
 *  segment to name. */
export function largestLosingSegment(stats: SegmentStat[]): SegmentStat | null {
  const losing = stats.filter((s) => s.segment !== 'branded' && s.winPct === 0 && s.categoryRuns > 0);
  if (!losing.length) return null;
  return [...losing].sort((a, b) => b.categoryRuns - a.categoryRuns)[0];
}

/** The one-line summary rendered under the per-segment table. Derived entirely
 *  from the segments actually present: names the most winnable segment if any,
 *  else the largest losing segment — never a canned segment name. `label` lets a
 *  caller wrap the segment name for its medium (markdown `**x**`, plain, etc.). */
export function segmentSummaryNote(
  stats: SegmentStat[],
  label: (name: string) => string = (s) => s
): string {
  const win = winnableSegment(stats);
  if (win) return `Your most winnable segment is ${label(SEGMENT_LABEL[win.segment])} (${win.winPct}%). Concentrate content and listings there first.`;
  const worst = largestLosingSegment(stats);
  if (worst) return `No segment is winning yet — your largest set, ${label(SEGMENT_LABEL[worst.segment])} (N=${worst.categoryRuns}), isn't converting. Start where your positioning fits.`;
  return 'No segment is winning yet. Start where your positioning fits.';
}
