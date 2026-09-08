// ADMIN-ONLY sweep cost estimator — WO-AEO-REPORT-INTEGRITY-003 Rev B §2.6.
//
// The pre-run screen said about $0.43 for a run that cost $5.156, because it multiplied
// answers by one flat per-answer figure. That cannot work: measured per-call cost spans
// **307×** between the cheapest and dearest engine, so the price of a sweep is decided by
// its engine MIX, not by its answer count.
//
// The founder authorises engine spend against the pre-run number, so an estimator wrong by
// an order of magnitude makes that authorisation meaningless. Two admin surfaces
// describing the same run must agree.
//
// Everything here is ADMIN-ONLY. No customer-facing surface carries cost — the estimate is
// suppressed for non-admins in the UI, and cost is stripped from the data on every export
// path (§2.6 amendment). This module must never be called from customer-facing copy.
//
// Rates are MEASURED, from 672 stored calls across eight four-engine sweeps on 2026-09-07.
// They are not list prices and not guesses. Re-derive them after any model change.

export type CostEngine = 'claude' | 'openai' | 'perplexity' | 'gemini';

/** Measured mean USD per call, 168 calls per engine, 2026-09-07. */
export const MEASURED_USD_PER_CALL: Record<CostEngine, number> = {
  claude: 0.02153,
  openai: 0.01211,
  perplexity: 0.00521,
  gemini: 0.00007,
};

/** Measured p90, used for the upper bound rather than a guessed margin. */
const P90_USD_PER_CALL: Record<CostEngine, number> = {
  claude: 0.02234,
  openai: 0.01426,
  perplexity: 0.00528,
  gemini: 0.00012,
};

export const RATES_MEASURED_ON = '2026-09-07';
export const RATES_SAMPLE_CALLS = 672;

export interface EstimateInput {
  questions: number;
  reps: number;
  engines: CostEngine[];
}

export interface EngineLine {
  engine: CostEngine;
  calls: number;
  usdPerCall: number;
  subtotal: number;
  shareOfTotalPct: number;
}

export interface CostEstimate {
  totalCalls: number;
  /** Central estimate from measured means. */
  expectedUsd: number;
  /** Upper bound from measured p90 — not a guessed margin. */
  upperUsd: number;
  lines: EngineLine[];
  /** The arithmetic, written out, because the founder authorises against it. */
  arithmetic: string;
  /** Honest statement of what this estimate is and is not. */
  accuracyNote: string;
}

export function estimateSweepCost(input: EstimateInput): CostEstimate {
  const questions = Math.max(0, Math.floor(input.questions));
  const reps = Math.max(0, Math.floor(input.reps));
  const engines = input.engines.filter((e) => e in MEASURED_USD_PER_CALL);
  const callsPerEngine = questions * reps;
  const totalCalls = callsPerEngine * engines.length;

  const lines: EngineLine[] = engines.map((engine) => ({
    engine,
    calls: callsPerEngine,
    usdPerCall: MEASURED_USD_PER_CALL[engine],
    subtotal: callsPerEngine * MEASURED_USD_PER_CALL[engine],
    shareOfTotalPct: 0,
  }));
  const expectedUsd = lines.reduce((a, l) => a + l.subtotal, 0);
  for (const l of lines) l.shareOfTotalPct = expectedUsd > 0 ? (l.subtotal / expectedUsd) * 100 : 0;
  lines.sort((a, b) => b.subtotal - a.subtotal);

  const upperUsd = engines.reduce((a, e) => a + callsPerEngine * P90_USD_PER_CALL[e], 0);

  const arithmetic = [
    `${questions} question${questions === 1 ? '' : 's'} × ${reps} run${reps === 1 ? '' : 's'} × ${engines.length} engine${engines.length === 1 ? '' : 's'} = ${totalCalls} calls`,
    ...lines.map(
      (l) =>
        `  ${l.engine.padEnd(11)} ${String(l.calls).padStart(4)} calls × $${l.usdPerCall.toFixed(5)} = $${l.subtotal.toFixed(2)}  (${l.shareOfTotalPct.toFixed(0)}% of the total)`
    ),
    `  expected $${expectedUsd.toFixed(2)} · upper bound $${upperUsd.toFixed(2)}`,
  ].join('\n');

  return {
    totalCalls,
    expectedUsd,
    upperUsd,
    lines,
    arithmetic,
    accuracyNote:
      `Rates are measured from ${RATES_SAMPLE_CALLS} stored calls on ${RATES_MEASURED_ON}, not list prices. ` +
      `Per-call cost spans about 307× between the cheapest and dearest engine, so the engine mix decides ` +
      `the price far more than the answer count does. Longer questions and heavier search raise it; ` +
      `re-derive the rates after any model change, and compare this figure against the actual after each run.`,
  };
}

/** Did the estimate hold? Run after each sweep so the two admin figures are reconciled
 *  rather than left to disagree — the defect §2.6 exists to close. */
export function reconcileEstimate(estimate: CostEstimate, actualUsd: number) {
  const ratio = estimate.expectedUsd > 0 ? actualUsd / estimate.expectedUsd : Infinity;
  const withinBand = actualUsd <= estimate.upperUsd * 1.1 && actualUsd >= estimate.expectedUsd * 0.5;
  return {
    actualUsd,
    ratio,
    withinBand,
    note: withinBand
      ? `Actual $${actualUsd.toFixed(2)} against an expected $${estimate.expectedUsd.toFixed(2)} — within band.`
      : `Actual $${actualUsd.toFixed(2)} is ${ratio.toFixed(1)}× the expected $${estimate.expectedUsd.toFixed(2)}. The rates are stale or the run shape changed; re-derive them before quoting another estimate.`,
  };
}
