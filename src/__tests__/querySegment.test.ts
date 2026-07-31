// WO-QA-003 C3 — query-set ICP segmentation.

import { describe, it, expect } from 'vitest';
import { classifyQuerySegment, segmentBreakdown, winnableSegment } from '../lib/querySegment';
import type { SweepRunResult } from '../lib/citationSweep';

const run = (over: Partial<SweepRunResult>): SweepRunResult => ({
  engine: 'claude', query: 'q', queryType: 'category', runIndex: 0,
  transcript: '', sources: [], costUsd: 0, grounding: 'search-grounded', ...over,
});

describe('classifyQuerySegment', () => {
  it('tags the buyer segment from the query framing', () => {
    expect(classifyQuerySegment('who is aeoanalyzers.com', 'branded')).toBe('branded');
    expect(classifyQuerySegment('best AEO software for enterprise brands')).toBe('enterprise');
    expect(classifyQuerySegment('affordable AEO tool for startups')).toBe('smb-affordable');
    expect(classifyQuerySegment('Semrush alternatives for tracking AI citations')).toBe('alternative-to-x');
    expect(classifyQuerySegment('BrightEdge vs specialized AEO software')).toBe('alternative-to-x');
    expect(classifyQuerySegment('how to monitor my brand in ChatGPT')).toBe('use-case');
    expect(classifyQuerySegment('top answer engine optimization platforms')).toBe('general');
  });
});

describe('segmentBreakdown + winnableSegment', () => {
  it('reports category win per segment, excluding truncated + model-prior', () => {
    // segmentBreakdown consumes SCORED runs (cited already set), as production does.
    const runs = [
      // enterprise: 0/2 — out of segment
      run({ query: 'best AEO for enterprise brands', cited: false }),
      run({ query: 'AEO platform for large organizations', cited: false }),
      // smb-affordable: 1/2 — winnable
      run({ query: 'affordable AEO tool for startups', cited: true }),
      run({ query: 'free AEO checker for small business', cited: false }),
      // excluded: a truncated + a model-prior smb run must not count
      run({ query: 'cheap AEO for startups', cited: true, truncated: true }),
      run({ query: 'budget AEO for solo founders', cited: true, grounding: 'model-prior' }),
    ];
    const stats = segmentBreakdown(runs);
    const smb = stats.find((s) => s.segment === 'smb-affordable')!;
    const ent = stats.find((s) => s.segment === 'enterprise')!;
    expect(smb.categoryRuns).toBe(2);   // truncated + model-prior excluded
    expect(smb.winPct).toBe(50);
    expect(ent.winPct).toBe(0);
    expect(winnableSegment(stats)!.segment).toBe('smb-affordable');
  });

  it('returns no winnable segment when nothing is winning (honest zero)', () => {
    const stats = segmentBreakdown([
      run({ query: 'best AEO for enterprise brands', transcript: 'Conductor.' }),
      run({ query: 'AEO for large teams', transcript: 'BrightEdge.' }),
    ]);
    expect(winnableSegment(stats)).toBeNull();
  });
});
