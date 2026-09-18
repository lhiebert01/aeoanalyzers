import { describe, it, expect } from 'vitest';
import { estimateSweepCost, reconcileEstimate, MEASURED_USD_PER_CALL, COST_SCALE } from '../lib/costEstimate';

/** WO-AEO-REPORT-INTEGRITY-003 Rev B §2.6. The pre-run screen said ~$0.43 for a run that
 *  cost $5.156, because it multiplied answers by one flat per-answer figure. Measured
 *  per-call cost spans about 307x between engines, so the mix decides the price. */

describe('the estimator is built on measured per-engine cost', () => {
  const ALL = ['claude', 'openai', 'perplexity', 'gemini'] as const;

  it('reproduces the real Sep 7 batch: 7 questions x 3 reps x 4 engines', () => {
    const e = estimateSweepCost({ questions: 7, reps: 3, engines: [...ALL] });
    expect(e.totalCalls).toBe(84);
    // The eight-target batch actually cost $6.54 of TRUE spend for 672 calls, i.e. ~$0.82
    // per target. The estimator reports on the same x10 admin scale as every stored cost,
    // so divide by COST_SCALE to compare against that true figure.
    expect(e.expectedUsd / COST_SCALE).toBeGreaterThan(0.7);
    expect(e.expectedUsd / COST_SCALE).toBeLessThan(0.95);
  });

  it('is on the SAME scale as the stored actual, so the two admin figures compare', () => {
    // The defect this closes: the estimate was true dollars and the displayed actual was
    // x10, so a run inside its band read as an 11x overrun. Sep 18 2026, aeoanalyzers.com:
    // estimate $0.47 true, actual displayed $5.419 — the same sweep, reported twice, in two
    // currencies.
    const e = estimateSweepCost({ questions: 12, reps: 1, engines: [...ALL] });
    const trueDollars = 12 * (MEASURED_USD_PER_CALL.claude + MEASURED_USD_PER_CALL.openai
      + MEASURED_USD_PER_CALL.perplexity + MEASURED_USD_PER_CALL.gemini);
    expect(e.expectedUsd).toBeCloseTo(trueDollars * COST_SCALE, 6);
    // and the real run reconciles instead of firing a false "rates are stale"
    expect(reconcileEstimate(e, 5.419).withinBand).toBe(true);
  });

  it('a flat per-answer figure cannot represent the spread', () => {
    const claudeOnly = estimateSweepCost({ questions: 10, reps: 1, engines: ['claude'] });
    const geminiOnly = estimateSweepCost({ questions: 10, reps: 1, engines: ['gemini'] });
    // Same call count, wildly different price — the defect a flat figure hides.
    expect(claudeOnly.totalCalls).toBe(geminiOnly.totalCalls);
    expect(claudeOnly.expectedUsd / geminiOnly.expectedUsd).toBeGreaterThan(100);
  });

  it('shows the arithmetic, per engine, because spend is authorised against it', () => {
    const e = estimateSweepCost({ questions: 12, reps: 1, engines: [...ALL] });
    expect(e.arithmetic).toContain('12 questions × 1 run × 4 engines = 48 calls');
    for (const eng of ALL) expect(e.arithmetic).toContain(eng);
    expect(e.arithmetic).toMatch(/expected \$\d+\.\d\d · upper bound \$\d+\.\d\d/);
    // the dearest engine is listed first, so the driver is visible at a glance
    expect(e.lines[0].engine).toBe('claude');
  });

  it('states what the estimate is and is not', () => {
    const e = estimateSweepCost({ questions: 1, reps: 1, engines: ['claude'] });
    expect(e.accuracyNote).toContain('measured');
    expect(e.accuracyNote).toContain('not list prices');
    expect(e.accuracyNote).toMatch(/307/);
  });

  it('upper bound is above the expected, from measured p90 rather than a guessed margin', () => {
    const e = estimateSweepCost({ questions: 7, reps: 3, engines: [...ALL] });
    expect(e.upperUsd).toBeGreaterThan(e.expectedUsd);
    expect(e.upperUsd).toBeLessThan(e.expectedUsd * 2);
  });

  it('handles a zero-size run without dividing by zero', () => {
    const e = estimateSweepCost({ questions: 0, reps: 3, engines: [...ALL] });
    expect(e.totalCalls).toBe(0);
    expect(e.expectedUsd).toBe(0);
  });
});

describe('the two admin figures get reconciled instead of left to disagree', () => {
  /** This test used to assert that a $5.156 actual against a $0.43 estimate was out of
   *  band, and it passed. Both halves of that were wrong: $5.156 was the x10 displayed
   *  figure for about $0.52 of true spend, so the run was INSIDE its band and the
   *  "12x miss" was a unit mismatch rather than an overrun. Re-expressed to test what
   *  the function is for — catching a real overrun in one consistent currency. */
  it('flags a genuine overrun, in one currency, rather than a unit mismatch', () => {
    const e = estimateSweepCost({ questions: 12, reps: 1, engines: ['claude', 'openai', 'perplexity', 'gemini'] });
    const r = reconcileEstimate(e, e.upperUsd * 5);
    expect(r.withinBand).toBe(false);
    expect(r.note).toContain('re-derive');
  });

  it('does NOT flag the Sep 18 run, which was inside its band all along', () => {
    const e = estimateSweepCost({ questions: 12, reps: 1, engines: ['claude', 'openai', 'perplexity', 'gemini'] });
    expect(reconcileEstimate(e, 5.419).withinBand).toBe(true);
  });

  it('passes a run that lands near the estimate', () => {
    const e = estimateSweepCost({ questions: 7, reps: 3, engines: ['claude', 'openai', 'perplexity', 'gemini'] });
    expect(reconcileEstimate(e, e.expectedUsd).withinBand).toBe(true);
  });

  it('rates are per-call, not per-answer, and claude dominates', () => {
    expect(MEASURED_USD_PER_CALL.claude / MEASURED_USD_PER_CALL.gemini).toBeGreaterThan(100);
  });
});
