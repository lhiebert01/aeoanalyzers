import { describe, it, expect } from 'vitest';
import { CostGuard, effectiveSweepCapUsd, monthlyCostCapUsd, sweepCapUsd, PLAN_PANEL, ANALYSES_PER_MONTH } from '../lib/sweepCaps';

describe('spend caps (pricing decision 13 Oct 2026)', () => {
  it('per-sweep caps are $1.50 on v1.1 and $4.00 on v1.2', () => {
    expect(sweepCapUsd('v1.1')).toBe(1.5);
    expect(sweepCapUsd('v1.2')).toBe(4);
  });
  it('monthly cap = plan sweeps × the plan panel cap', () => {
    expect(monthlyCostCapUsd('daypass')).toBeCloseTo(4.5);
    expect(monthlyCostCapUsd('Pro')).toBe(32);
    expect(monthlyCostCapUsd('Business')).toBe(80);
    expect(PLAN_PANEL).toEqual({ daypass: 'v1.1', Pro: 'v1.2', Business: 'v1.2' });
    expect(ANALYSES_PER_MONTH).toBe(200);
  });
  it('a sweep never gets more than what is left of the month', () => {
    expect(effectiveSweepCapUsd('v1.2', 32, 0)).toBe(4);
    expect(effectiveSweepCapUsd('v1.2', 32, 30)).toBe(2);
    expect(effectiveSweepCapUsd('v1.2', 32, 32)).toBe(0);
    expect(effectiveSweepCapUsd('v1.2', 32, 40)).toBe(0);
  });
  it('reserves before spending: below, at and above the cap', () => {
    const g = new CostGuard(0.2, { grok: 0.1 });
    const a = g.tryReserve('grok'); expect(a).toBe(0.1);
    const b = g.tryReserve('grok'); expect(b).toBe(0.1); // exactly at the cap is allowed
    expect(g.tryReserve('grok')).toBeNull(); // in-flight reservations count
    g.settle('grok', a!, 0.05); g.settle('grok', b!, 0.05);
    expect(g.spent).toBeCloseTo(0.1);
    expect(g.tryReserve('grok')).toBe(0.1);
    expect(g.skipped).toBe(1);
  });
  it('ratchets the reservation up when a call costs more than expected', () => {
    const g = new CostGuard(1, { grok: 0.1 });
    const r = g.tryReserve('grok')!; g.settle('grok', r, 0.4);
    expect(g.tryReserve('grok')).toBe(0.4);
    expect(g.tryReserve('grok')).toBeNull(); // 0.4 spent + 0.4 reserved + 0.4 > 1
  });
  it('a zero cap refuses every call', () => {
    expect(new CostGuard(0).tryReserve('gemini')).toBeNull();
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const ROOT = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

describe('prices are consistent on every surface we own (13 Oct 2026)', () => {
  const surfaces = ['src/components/Payments.tsx', 'src/components/MarketingLanding.tsx', 'src/components/SweepDashboard.tsx',
    'src/App.tsx', 'src/lib/json-ld.ts', 'public/llms.txt', 'public/best-aeo-tools/index.html', 'public/aeo-buyers-standard/index.html',
    'api/run-sweep.ts', 'api/llm-generate.ts'];
  it('no surface carries a retired price', () => {
    for (const f of surfaces) expect(read(f), f).not.toMatch(/\$(24|49|199)\b/);
  });
  it('served JSON-LD tops out at the Business price', () => {
    expect(read('src/lib/json-ld.ts')).toMatch(/highPrice: '599'/);
  });
  it('"five-engine panel on Pro and Business" appears exactly once on the pricing page', () => {
    expect(read('src/components/Payments.tsx').match(/five-engine panel on Pro and Business/gi) || []).toHaveLength(1);
  });
  it('no blog post carries a price', () => {
    const { readdirSync } = require('node:fs');
    for (const d of readdirSync(resolve(ROOT, 'public/blog'), { withFileTypes: true }).filter((x: any) => x.isDirectory())) {
      const t = read(`public/blog/${d.name}/index.html`).replace(/<[^>]+>/g, ' ');
      expect(t, d.name).not.toMatch(/\$\s?\d/);
    }
  });
  it('the Search Console feature is not named on customer-facing pricing', () => {
    expect(read('src/components/Payments.tsx')).not.toMatch(/search console|fan-?out/i);
  });
});
