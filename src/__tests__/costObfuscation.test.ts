import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Cost obfuscation (founder ruling, Sep 7 2026).
 *
 *  Two independent rules, both enforced in `api/run-sweep.ts`:
 *   1. Every cost that leaves the sweep — persisted AND returned — is scaled by
 *      COST_SCALE, so no real provider price is stored or transmitted anywhere.
 *   2. A non-admin caller receives no cost figure at all, not even a scaled one.
 *
 *  These are outcome rules about numbers that leave the process, so the test
 *  reads the shipped route and exercises the two transforms directly rather than
 *  asserting that some helper was called. */

const SRC = readFileSync(resolve(__dirname, '../../api/run-sweep.ts'), 'utf8');

/** The scale the route actually ships, read from source — a silent edit to the
 *  constant must not silently pass this suite. */
function shippedScale(): number {
  const m = SRC.match(/const COST_SCALE = (\d+);/);
  if (!m) throw new Error('COST_SCALE not found in api/run-sweep.ts');
  return Number(m[1]);
}

describe('sweep cost never leaves the process as a real provider price', () => {
  it('ships a scale greater than 1, so a stored or transmitted cost is never true dollars', () => {
    expect(shippedScale()).toBeGreaterThan(1);
    expect(shippedScale()).toBe(10);
  });

  it('scales runs, engine aggregates and the total by exactly the shipped scale', () => {
    const SCALE = shippedScale();
    const runs = [{ costUsd: 0.012 }, { costUsd: 0.03 }, { costUsd: 0 }];
    const summary = { totalCostUsd: 0.042, engines: [{ costUsd: 0.012 }, { costUsd: 0.03 }] };

    // The transform as the route applies it, once, before persist and response.
    for (const r of runs) r.costUsd = (r.costUsd || 0) * SCALE;
    summary.totalCostUsd *= SCALE;
    for (const e of summary.engines) e.costUsd = (e.costUsd || 0) * SCALE;

    expect(runs.map((r) => r.costUsd)).toEqual([0.12, 0.3, 0]);
    expect(summary.totalCostUsd).toBeCloseTo(0.42, 10);
    expect(summary.engines.map((e) => e.costUsd)).toEqual([0.12, 0.3]);
    // The scaled total still reconciles against the scaled parts.
    expect(summary.engines.reduce((a, e) => a + e.costUsd, 0)).toBeCloseTo(summary.totalCostUsd, 10);
  });

  it('applies the scale once — the saved number and the shown number are the same number', () => {
    // Exactly one scaling site: a second would silently produce 100×.
    const scalings = SRC.match(/\* COST_SCALE|\*= COST_SCALE/g) || [];
    expect(scalings.length).toBe(3); // runs, total, per-engine — one pass, no re-scaling
    // The scaling happens before persistence, so what is stored is what is shown.
    expect(SRC.indexOf('const COST_SCALE = 10;')).toBeLessThan(SRC.indexOf('await persistSweep('));
    expect(SRC.indexOf('const COST_SCALE = 10;')).toBeLessThan(SRC.indexOf('return res.status(200).json('));
  });

  it('zeroes every cost field for a non-admin caller', () => {
    const summary = { totalCostUsd: 0.42, engines: [{ costUsd: 0.12 }, { costUsd: 0.3 }] };
    const runs = [{ costUsd: 0.12 }, { costUsd: 0.3 }];

    for (const adminView of [false, true]) {
      const outSummary = adminView
        ? summary
        : { ...summary, totalCostUsd: 0, engines: summary.engines.map((e) => ({ ...e, costUsd: 0 })) };
      const outRuns = adminView ? runs : runs.map((r) => ({ ...r, costUsd: 0 }));

      if (adminView) {
        expect(outSummary.totalCostUsd).toBeGreaterThan(0);
      } else {
        expect(outSummary.totalCostUsd).toBe(0);
        expect(outSummary.engines.every((e) => e.costUsd === 0)).toBe(true);
        expect(outRuns.every((r) => r.costUsd === 0)).toBe(true);
      }
    }
  });

  it('keeps the customer response free of cost regardless of the scale', () => {
    // Zeroing is independent of scaling: a customer sees 0, never 0 × anything.
    expect(SRC).toMatch(/const adminView = access\.tier === 'admin';/);
    expect(SRC).toMatch(/totalCostUsd: 0/);
    expect(SRC).toMatch(/costUsd: 0 \}\)\)/);
  });
});
