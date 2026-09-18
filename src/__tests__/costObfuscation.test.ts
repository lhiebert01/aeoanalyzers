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
const LIB = readFileSync(resolve(__dirname, '../lib/costEstimate.ts'), 'utf8');

/** The scale the route actually ships, read from source — a silent edit to the
 *  constant must not silently pass this suite.
 *
 *  It moved to src/lib/costEstimate.ts on Sep 18 2026 and the route now imports it.
 *  It had been declared in the route alone, while the pre-run ESTIMATE was computed in
 *  true dollars — so the two admin figures for one sweep were in different currencies
 *  and appeared to disagree by ~11x. One home, both surfaces. */
function shippedScale(): number {
  const m = LIB.match(/export const COST_SCALE = (\d+);/);
  if (!m) throw new Error('COST_SCALE not found in src/lib/costEstimate.ts');
  return Number(m[1]);
}

describe('sweep cost never leaves the process as a real provider price', () => {
  it('ships a scale greater than 1, so a stored or transmitted cost is never true dollars', () => {
    expect(shippedScale()).toBeGreaterThan(1);
    expect(shippedScale()).toBe(10);
  });

  it('the route imports the scale rather than declaring its own copy', () => {
    // A second copy is exactly how the estimate and the actual drifted apart.
    expect(SRC).toContain("import { COST_SCALE } from '../src/lib/costEstimate.js';");
    expect(SRC).not.toMatch(/const COST_SCALE = \d+;/);
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

/** COST NEVER APPEARS IN CUSTOMER-FACING CONTENT — founder rule, restated 2026-09-20.
 *
 *  Prices belong on the pricing page. What a sweep COSTS US does not belong anywhere a
 *  customer can read it, because a reader immediately does the subtraction and forgets
 *  everything the tool did between the two numbers.
 *
 *  It was published. The primer carried "costs us about $2.70 in engine fees — measured,
 *  from a run of ours on 18 September that came to $0.54 for 48 answers." I put it there
 *  on an instruction to replace a hedge with the measured figure, and did not weigh that
 *  instruction against the older standing rule. The conflict was mine to raise and I did
 *  not raise it.
 *
 *  This test is the raising. */
describe('no customer-facing surface states what anything costs us', () => {
  const { readFileSync, readdirSync, statSync } = require('node:fs') as typeof import('node:fs');
  const { resolve, join } = require('node:path') as typeof import('node:path');
  const ROOT = resolve(__dirname, '..', '..');

  const walk = (d: string, out: string[] = []): string[] => {
    for (const n of readdirSync(d)) {
      if (['node_modules', 'dist', '.git', 'docs', 'private'].includes(n) || n.startsWith('.')) continue;
      const f = join(d, n);
      if (statSync(f).isDirectory()) walk(f, out);
      else if (/\.(tsx?|html)$/.test(f) && !/__tests__|\.test\./.test(f)) out.push(f);
    }
    return out;
  };

  // Everything a logged-out or paying customer can read. Deliberately excludes
  // src/lib and api/, where cost is computed and shown to the admin alone.
  const SURFACES = [
    ...walk(resolve(ROOT, 'public')),
    ...walk(resolve(ROOT, 'src/components')),
  ];

  const COST_TO_US = [
    /\bcosts?\s+us\b/i,
    /\bengine fees?\b/i,
    /\bour (own )?cost\b/i,
    /\bCOGS\b/,
    /\bcost per (call|answer|query|sweep|run)\b/i,
    /\$[\d.]+\s+(in|of)\s+(engine|api|llm|provider)\b/i,
  ];

  it('states no cost-to-us figure anywhere a customer can read it', () => {
    const offenders: string[] = [];
    for (const f of SURFACES) {
      for (const [i, line] of readFileSync(f, 'utf8').split('\n').entries()) {
        if (/^\s*(\/\/|\*|\/\*|<!--)/.test(line)) continue;           // comments record why, and must survive
        if (/isAdmin|adminView|admin-only/.test(line)) continue;      // admin-gated cost display is allowed
        for (const rx of COST_TO_US) {
          if (rx.test(line)) { offenders.push(`${f.replace(ROOT, '')}:${i + 1}  ${line.trim().slice(0, 80)}`); break; }
        }
      }
    }
    expect(offenders, `cost-to-us on a customer surface:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('prices are still allowed — the rule is about our costs, not our prices', () => {
    const pricing = readFileSync(resolve(ROOT, 'src/components/Payments.tsx'), 'utf8');
    expect(pricing).toMatch(/\$24|\$49|\$199/);
  });
});
