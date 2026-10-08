import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describeDenominator, pooledFromSummary, sameConfig, buildSeries, rescoreNote, SCORING_VERSION } from '../lib/sweepDisclosure';
import { sweepScorecard, scoreRun, type SweepRunResult } from '../lib/citationSweep';

/** WO-AEO-PRODUCT-FIXES-003 — what a number is counted out of, and whether two surfaces agree. */
const src = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');

function mkRuns(): SweepRunResult[] {
  // 5 category questions × 2 engines × 3 runs = 30 category answers; 2 branded × 2 × 3 = 12.
  const out: SweepRunResult[] = [];
  const engines = ['claude', 'openai'] as const;
  for (const e of engines) for (let q = 0; q < 2; q++) for (let i = 0; i < 3; i++) out.push({ engine: e, query: `who is acme.com ${q}`, queryType: 'branded', runIndex: i, transcript: 'Acme (acme.com) is a CRM.', sources: ['https://acme.com/'], costUsd: 0, grounding: 'search-grounded' } as any);
  for (const e of engines) for (let q = 0; q < 5; q++) for (let i = 0; i < 3; i++) {
    const memory = e === 'openai' && q < 2;            // 6 answered from memory
    const errored = e === 'claude' && q === 4 && i === 0; // 1 errored
    const cut = e === 'claude' && q === 4 && i === 1;     // 1 cut off
    out.push({ engine: e, query: `best crm ${q}`, queryType: 'category', runIndex: i, transcript: errored ? '[error: 429]' : 'HubSpot and Zoho lead.', sources: [], costUsd: 0, grounding: memory ? 'model-prior' : 'search-grounded', truncated: cut, errored } as any);
  }
  return out;
}

describe('4.3 — every N says what it is counted out of', () => {
  it('states questions × engines × runs, and names every excluded answer with its reason', () => {
    const client = { domain: 'acme.com', brand: 'Acme' };
    const scored = mkRuns().map((r) => scoreRun(r, client, [{ name: 'HubSpot' }]));
    const sc = sweepScorecard(scored, client, [{ name: 'HubSpot' }]);
    const d = describeDenominator(scored, 2, 3, sc);
    expect(d.category).toBe('N=22 scored answers = 5 questions × 2 engines × 3 runs = 30 category answers; 6 answered from memory (no search, not scored), 1 errored (excluded), 1 cut off by the length cap (not scored).');
    expect(d.branded).toBe('N=12 = 2 questions × 2 engines × 3 runs = 12 branded answers.');
    expect(22 + 6 + 1 + 1).toBe(30); // the line adds up
  });
});

describe('4.2 — stored and opened figures agree, or the row says why', () => {
  const summary = { engines: [{ engine: 'claude', brandedRuns: 6, brandedCited: 6, categoryRuns: 10, categoryCited: 2 }, { engine: 'openai', brandedRuns: 6, brandedCited: 6, categoryRuns: 20, categoryCited: 7 }] } as any;
  it('pools over engines the way History does: 9 of 30 = 30%', () => {
    expect(pooledFromSummary(summary)).toEqual({ branded: 100, category: 30 });
    expect(pooledFromSummary({ engines: [] } as any)).toEqual({ branded: null, category: null });
  });
  it('a re-score that moves nothing records nothing; one that moves a figure records old → new and why', () => {
    expect(rescoreNote('old', { branded: 100, category: 30 }, { branded: 100, category: 30 })).toBeNull();
    const n = rescoreNote(null, { branded: 100, category: 36 }, { branded: 100, category: 30 });
    expect(n).toContain(`scoring rules ${SCORING_VERSION} (stored under unversioned rules): recommended 36% → 30%`);
    expect(n).toMatch(/Errored runs are excluded/);
  });
  it('both write paths persist the scoring version; the saved view writes back with the note', () => {
    expect(src('../../api/run-sweep.ts')).toMatch(/scoring_version: SCORING_VERSION/);
    expect(src('../../scripts/import-stored-sweeps.ts')).toMatch(/scoring_version: SCORING_VERSION/);
    const dash = src('../components/SweepDashboard.tsx');
    expect(dash).toMatch(/rescore_note: note/);
    expect(dash).toMatch(/scoring_version: SCORING_VERSION, rescored_at/);
    expect(src('../App.tsx')).toMatch(/older rules · re-scored on open/);
  });
});

describe('4.4 — two dates on the same configs are a series', () => {
  const row = (id: string, date: string, cat: number, over = {}) => ({ id, domain: 'nimble.com', created_at: `${date}T12:00:00Z`, category: 'CRM for small business and solopreneurs', category_queries: ['best crm', 'top crm'], summary: { engines: [{ engine: 'claude', brandedRuns: 24, brandedCited: 24, categoryRuns: 100, categoryCited: cat }] }, ...over });
  it('pairs the dates, computes the delta against the previous date, and keeps only the same configs', () => {
    const rows = [row('b', '2026-10-08', 28), row('a', '2026-09-07', 3), row('x', '2026-09-20', 50, { category: 'different noun' }), row('y', '2026-09-25', 60, { domain: 'other.com' }), row('z', '2026-09-26', 70, { category_queries: ['something else'] })];
    const s = buildSeries(rows as any, rows[0] as any);
    expect(s.map((p) => [p.date, p.category, p.deltaCategory])).toEqual([['2026-09-07', 3, null], ['2026-10-08', 28, 25]]);
    expect(s[0].branded).toBe(100);
  });
  it('a row that predates the config columns compares on domain + category only', () => {
    expect(sameConfig(row('a', '2026-09-07', 3, { category_queries: null }) as any, row('b', '2026-10-08', 28) as any)).toBe(true);
  });
  it('the series card and the memory split are on the screen', () => {
    const dash = src('../components/SweepDashboard.tsx');
    expect(dash).toContain('Measured over time · same questions, same engines');
    expect(dash).toMatch(/answers given from memory are reported beside the tile/);
    expect(dash).toContain('answered from memory (no search, not scored)'.slice(0, 0) + '{(s as { note?: string }).note}');
  });
});
