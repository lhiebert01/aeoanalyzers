import { describe, it, expect } from 'vitest';
import { estimateSweepCost, reconcileEstimate, MEASURED_USD_PER_CALL } from '../lib/costEstimate';

/** WO-AEO-REPORT-INTEGRITY-003 Rev B §2.6. The pre-run screen said ~$0.43 for a run that
 *  cost $5.156, because it multiplied answers by one flat per-answer figure. Measured
 *  per-call cost spans about 307x between engines, so the mix decides the price. */

describe('the estimator is built on measured per-engine cost', () => {
  const ALL = ['claude', 'openai', 'perplexity', 'gemini'] as const;

  it('reproduces the real Sep 7 batch: 7 questions x 3 reps x 4 engines', () => {
    const e = estimateSweepCost({ questions: 7, reps: 3, engines: [...ALL] });
    expect(e.totalCalls).toBe(84);
    // The eight-target batch actually cost $6.54 for 672 calls, i.e. ~$0.82 per target.
    expect(e.expectedUsd).toBeGreaterThan(0.7);
    expect(e.expectedUsd).toBeLessThan(0.95);
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
  it('flags the historic 12x miss rather than passing it silently', () => {
    const e = estimateSweepCost({ questions: 12, reps: 1, engines: ['claude', 'openai', 'perplexity', 'gemini'] });
    const r = reconcileEstimate(e, 5.156);
    expect(r.withinBand).toBe(false);
    expect(r.note).toContain('re-derive');
  });

  it('passes a run that lands near the estimate', () => {
    const e = estimateSweepCost({ questions: 7, reps: 3, engines: ['claude', 'openai', 'perplexity', 'gemini'] });
    expect(reconcileEstimate(e, e.expectedUsd).withinBand).toBe(true);
  });

  it('rates are per-call, not per-answer, and claude dominates', () => {
    expect(MEASURED_USD_PER_CALL.claude / MEASURED_USD_PER_CALL.gemini).toBeGreaterThan(100);
  });
});
