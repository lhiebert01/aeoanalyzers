import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { aggregateSweep, sweepScorecard, scoreRun, type SweepRunResult } from '../lib/citationSweep';

/** The History list, the opened view and the downloaded report must state ONE number on
 *  ONE basis: pooled across engines over SEARCH-GROUNDED runs only.
 *
 *  The list previously took an unweighted mean of per-engine percentages. Two faults
 *  compounded: an engine with zero grounded runs reports citationWinPct 0 rather than
 *  null, so a non-measurement entered the mean as a real zero; and averaging percentages
 *  weighted an engine with 15 grounded runs the same as one with none. A real sweep read
 *  27% on the list against 53% everywhere else. */

const pooledFromEngines = (engines: any[]) => {
  const runs = engines.reduce((a, e) => a + (e.categoryRuns || 0), 0);
  if (!runs) return null;
  return Math.round((engines.reduce((a, e) => a + (e.categoryCited || 0), 0) / runs) * 100);
};

function run(over: Partial<SweepRunResult>): SweepRunResult {
  return {
    engine: 'claude', query: 'best widgets', queryType: 'category', runIndex: 0,
    transcript: 'Try Example. https://example.com', sources: ['https://example.com/a'],
    costUsd: 0, grounding: 'search-grounded', ...over,
  } as SweepRunResult;
}

describe('the three surfaces agree on one basis', () => {
  const client = { domain: 'example.com', brand: 'Example' };

  it('pooling matches the scorecard when an engine has zero grounded runs', () => {
    // perplexity: 2 grounded, both cited. gemini: 2 model-prior, zero grounded.
    const runs = [
      run({ engine: 'perplexity', runIndex: 0 }),
      run({ engine: 'perplexity', runIndex: 1 }),
      run({ engine: 'gemini', runIndex: 0, grounding: 'model-prior' }),
      run({ engine: 'gemini', runIndex: 1, grounding: 'model-prior' }),
    ].map((r) => scoreRun(r, client, []));

    const agg = aggregateSweep(runs, client, []);
    const card = sweepScorecard(runs, client, []);

    const gemini = agg.engines.find((e) => e.engine === 'gemini')!;
    expect(gemini.categoryRuns).toBe(0);
    // The known trap: an unmeasured engine still reports 0%, not null.
    expect(gemini.citationWinPct).toBe(0);

    const unweightedMean = Math.round(
      agg.engines.reduce((a, e) => a + (e.citationWinPct || 0), 0) / agg.engines.length
    );
    // The old list would have halved a 100% result by averaging in a non-measurement.
    expect(unweightedMean).toBeLessThan(card.categoryRecommendationWinPct);
    // Pooling agrees with the scorecard exactly.
    expect(pooledFromEngines(agg.engines)).toBe(card.categoryRecommendationWinPct);
  });

  it('renders nothing rather than 0% when no engine ran a search', () => {
    const runs = [
      run({ engine: 'gemini', grounding: 'model-prior' }),
      run({ engine: 'openai', grounding: 'model-prior' }),
    ].map((r) => scoreRun(r, client, []));
    expect(pooledFromEngines(aggregateSweep(runs, client, []).engines)).toBeNull();
  });

  it('the History list pools and never averages percentages', () => {
    const src = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
    expect(src).toMatch(/const pooled = \(citedKey/);
    expect(src).not.toMatch(/reduce\(\(a, e\) => a \+ \(e\[k\] \|\| 0\), 0\) \/ engines\.length/);
  });

  it('every surface states the basis in the same words', () => {
    const src = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
    expect(src).toContain('search-grounded runs only');
    expect(src).toContain('unmeasured, not zero');
  });
});
