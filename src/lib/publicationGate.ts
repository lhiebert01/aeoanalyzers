// PUBLICATION GATE — founder ruling, Sep 8 2026.
//
// No measured figure may render into public content unless, at publish time, the
// renderer resolves the stored sweep it came from AND that sweep's transcripts,
// and recomputes the figure from them.
//
// Why this exists. The July 2026 branded retrievability figure of 98% was published
// and is now UNVERIFIABLE: the baseline file holds a summary with no transcripts, and
// no stored sweep carries those 240 runs. A company selling reproducibility published
// a number it cannot reproduce. The gate makes that impossible to repeat rather than
// relying on anyone remembering.
//
// The gate FAILS CLOSED. Every failure mode — sweep not found, no transcripts, metric
// mismatch, unregistered figure — blocks publication. There is no "warn and continue".
//
// This module is pure: it takes a resolver so it can be tested without a network.

import { sweepScorecard, scoreRun, type SweepRunResult, type Competitor } from './citationSweep';

/** A measured figure appearing in public content, and where it came from. */
export interface PublishedClaim {
  /** Where it appears, for the failure message: 'public/blog/x/index.html'. */
  location: string;
  /** The figure exactly as it will render, e.g. '80' or '0'. */
  rendered: string;
  /** Which stored sweep it was measured from. */
  sweepId: string;
  /** Which metric of that sweep. */
  metric: 'brandedRetrievabilityPct' | 'categoryRecommendationWinPct' | 'ownedCitationRatePct';
  /** The N the content states alongside it. Checked too — a figure without its N is half a claim. */
  statedN: number;
}

/** What a resolver must return for a sweep id. `null` means "not found". */
export interface ResolvedSweep {
  domain: string;
  brand?: string;
  competitors: Competitor[];
  /** The stored transcripts. An EMPTY array is a failure, not an empty result. */
  runs: SweepRunResult[];
}

export type SweepResolver = (sweepId: string) => Promise<ResolvedSweep | null>;

export interface GateFailure {
  location: string;
  sweepId: string;
  metric: string;
  reason:
    | 'sweep-not-found'
    | 'no-transcripts'
    | 'metric-unavailable'
    | 'value-mismatch'
    | 'n-mismatch';
  detail: string;
}

export interface GateResult {
  ok: boolean;
  checked: number;
  failures: GateFailure[];
}

/** Recompute a metric from stored transcripts, re-scoring rather than trusting
 *  whatever was stored — the same discipline the saved view uses. */
function recompute(sweep: ResolvedSweep, metric: PublishedClaim['metric']) {
  const client = { domain: sweep.domain, brand: sweep.brand || undefined };
  const scored = sweep.runs.map((r) => scoreRun(r, client, sweep.competitors));
  const sc = sweepScorecard(scored, client, sweep.competitors);
  switch (metric) {
    case 'brandedRetrievabilityPct':
      return { value: sc.brandedRetrievabilityPct, n: sc.brandedRuns };
    case 'categoryRecommendationWinPct':
      return { value: sc.categoryRecommendationWinPct, n: sc.categoryRuns };
    case 'ownedCitationRatePct':
      return { value: sc.ownedCitationRatePct, n: sc.ownedCitationN };
  }
}

/** Verify every claim. Returns ok:false with a reason per failure. Never throws for
 *  a bad claim — the caller decides how loudly to fail, and the CLI exits non-zero. */
export async function verifyClaims(
  claims: PublishedClaim[],
  resolve: SweepResolver
): Promise<GateResult> {
  const failures: GateFailure[] = [];

  for (const c of claims) {
    const base = { location: c.location, sweepId: c.sweepId, metric: c.metric };

    let sweep: ResolvedSweep | null = null;
    try {
      sweep = await resolve(c.sweepId);
    } catch (e: any) {
      sweep = null;
      failures.push({ ...base, reason: 'sweep-not-found', detail: `resolver threw: ${e?.message || e}` });
      continue;
    }

    if (!sweep) {
      failures.push({ ...base, reason: 'sweep-not-found', detail: 'no stored sweep with this id' });
      continue;
    }
    if (!sweep.runs || sweep.runs.length === 0) {
      // This is the July 98% case exactly: the sweep exists as a record, the
      // transcripts do not. Publishing from it is publishing an unverifiable number.
      failures.push({ ...base, reason: 'no-transcripts', detail: 'sweep resolved but holds zero stored transcripts' });
      continue;
    }

    const got = recompute(sweep, c.metric);
    if (got.value === null || got.value === undefined) {
      failures.push({ ...base, reason: 'metric-unavailable', detail: `${c.metric} is not computable from these runs` });
      continue;
    }
    if (String(got.value) !== String(c.rendered)) {
      failures.push({
        ...base,
        reason: 'value-mismatch',
        detail: `content renders ${c.rendered}, transcripts recompute to ${got.value}`,
      });
      continue;
    }
    if (got.n !== c.statedN) {
      failures.push({
        ...base,
        reason: 'n-mismatch',
        detail: `content states N=${c.statedN}, transcripts give N=${got.n}`,
      });
    }
  }

  return { ok: failures.length === 0, checked: claims.length, failures };
}

/** Human-readable block for a CI log or a close-out. */
export function formatGateResult(r: GateResult): string {
  if (r.ok) return `PUBLICATION GATE PASSED — ${r.checked} figure${r.checked === 1 ? '' : 's'} resolved to stored transcripts and recomputed.`;
  const lines = [`PUBLICATION GATE FAILED — ${r.failures.length} of ${r.checked} figures did not verify.`, ''];
  for (const f of r.failures) {
    lines.push(`  ${f.location}`);
    lines.push(`    metric ${f.metric} from sweep ${f.sweepId}`);
    lines.push(`    ${f.reason}: ${f.detail}`);
  }
  lines.push('');
  lines.push('  Nothing is published. Fix the figure, or remove it, or publish it labelled unverifiable.');
  return lines.join('\n');
}
