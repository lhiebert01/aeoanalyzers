import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { accuracyWhenNamed } from '../lib/fidelity';
import { verifyClaims } from '../lib/publicationGate';
import { scoreRun } from '../lib/citationSweep';
import { sweepMeaning } from '../lib/reportCover';

/** WO-AEO-BRANDED-ACCURACY-004 Part A — described accurately when named, BESIDE retrievability. */
const truth = { brandName: 'Acme', founders: ['Jane Roe'], sameAs: [], facts: [] } as any;
const run = (cited: boolean, transcript: string) => ({ cited, transcript });

describe('the metric', () => {
  it('accurate ÷ named; an invented founder is a miss; an answer that did not name you is not counted', () => {
    const a = accuracyWhenNamed([run(true, 'Acme was founded by Jane Roe.'), run(true, 'Acme was co-founded by John Doe. It sells CRM.'), run(false, 'No idea.')], truth)!;
    expect([a.accurate, a.named, a.pct]).toEqual([1, 2, 50]);
  });
  it('the definition states exactly which facts were checked — never "every fact"', () => {
    const a = accuracyWhenNamed([run(true, 'Acme, founded by Jane Roe.')], truth)!;
    expect(a.definition).toBe('1 of the 1 answers that named you stated no fact your site contradicts. Checked: the brand name "Acme" and the founder Jane Roe, as your own site publishes them.');
    const noFounder = accuracyWhenNamed([run(true, 'Acme.')], { ...truth, founders: [] })!;
    expect(noFounder.definition).toMatch(/Checked: the brand name "Acme", as your own site publishes them\.$/);
  });
  it('no site snapshot → unmeasured (null), never 100%', () => {
    expect(accuracyWhenNamed([run(true, 'Acme.')], null)).toBeNull();
  });
});

describe('the "what this means" line no longer overclaims', () => {
  it('says how many and what was checked, instead of "none got a fact wrong"', () => {
    const m = sweepMeaning({ brand: 'Acme', brandedPct: 100, brandedN: 8, categoryPct: 0, categoryN: 20, ownedPct: 100, topNamed: null, modelPriorRuns: 0, drifted: 0, collisions: [], accuracy: { accurate: 8, named: 8, checked: ['the brand name "Acme"'] } });
    expect(m).toContain('8 of the 8 answers that named you stated nothing your site contradicts on the brand name "Acme".');
    expect(m).not.toMatch(/got a fact wrong/);
  });
});

describe('our own series, backfilled at no engine spend', () => {
  const load = (f: string) => JSON.parse(readFileSync(`docs/baselines/${f}`, 'utf8'));
  const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
  const comps = [{ name: 'Profound' }, { name: 'Otterly AI' }, { name: 'Peec AI' }];
  const recompute = (d: any, t: any) => accuracyWhenNamed(d.runs.map((r: any) => scoreRun(r, client, comps)).filter((r: any) => r.queryType === 'branded'), t)!;
  it('September: 31 of 32 — one answer invented a co-founder', () => {
    const d = load('aeoanalyzers-2026-09-01.json');
    const a = recompute(d, d.truthForAccuracy);
    expect([a.accurate, a.named]).toEqual([31, 32]);
    expect(d.accuracyWhenNamed).toMatchObject({ accurate: 31, named: 32 });
  });
  it('October: recomputes to the stored counts, against the facts captured at run time', () => {
    const d = load('aeoanalyzers-2026-10-08.json');
    const a = recompute(d, d.truth);
    expect({ accurate: a.accurate, named: a.named }).toEqual({ accurate: d.accuracyWhenNamed.accurate, named: d.accuracyWhenNamed.named });
  });
  it('the publication gate verifies the figure and its N, and fails closed without a snapshot', async () => {
    const d = load('aeoanalyzers-2026-09-01.json');
    const resolve = async (id: string) => (id === 'sep' ? { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers', competitors: comps, runs: d.runs, truth: d.truthForAccuracy } : id === 'bare' ? { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers', competitors: comps, runs: d.runs } : null);
    expect((await verifyClaims([{ location: 'x', rendered: '97', sweepId: 'sep', metric: 'accuracyWhenNamedPct', statedN: 32 }], resolve)).ok).toBe(true);
    expect((await verifyClaims([{ location: 'x', rendered: '100', sweepId: 'sep', metric: 'accuracyWhenNamedPct', statedN: 32 }], resolve)).ok).toBe(false);
    const bare = await verifyClaims([{ location: 'x', rendered: '97', sweepId: 'bare', metric: 'accuracyWhenNamedPct', statedN: 32 }], resolve);
    expect(bare.ok).toBe(false);
    expect(bare.failures[0].reason).toBe('metric-unavailable');
  });
});

describe('retrievability stays the gate', () => {
  it('the Do-now classifier still reads retrievability, not accuracy', () => {
    const src = readFileSync('src/lib/doNowPlan.ts', 'utf8');
    expect(src).toMatch(/export function classifyProblem\(perEngine: EngineRetrieval\[\]/);
    expect(src).not.toMatch(/accuracyWhenNamed/);
    expect(readFileSync('src/lib/sweepActions.ts', 'utf8')).toMatch(/export const WEAK_RETRIEVABILITY = 80;/);
  });
});
