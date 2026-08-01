// WO-QA-003 C3 — query-set ICP segmentation.

import { describe, it, expect } from 'vitest';
import { classifyQuerySegment, segmentBreakdown, winnableSegment, largestLosingSegment, segmentSummaryNote } from '../lib/querySegment';
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

// WO-SWEEP-POLISH-002 B4 — the all-zero summary line must be DERIVED from the
// segments actually present (name the largest-N losing segment), never the canned
// "enterprise-framed" line that referenced a segment that may not be rendered.
describe('largestLosingSegment + segmentSummaryNote (B4)', () => {
  const allZero = segmentBreakdown([
    // head-to-head / alternatives: 3 losing runs — the largest losing set
    run({ query: 'affordable alternatives to Profound', cited: false }),
    run({ query: 'Profound vs Otterly for AEO', cited: false }),
    run({ query: 'Peec AI alternatives for tracking', cited: false }),
    // use-case: 2 losing runs
    run({ query: 'how to monitor my brand in ChatGPT', cited: false }),
    run({ query: 'how to track brand mentions in AI answers', cited: false }),
    // category discovery: 1 losing run — NOTE: no enterprise segment present at all
    run({ query: 'leading AEO software platforms', cited: false }),
  ]);

  it('names the losing segment carrying the most runs', () => {
    const worst = largestLosingSegment(allZero)!;
    expect(worst.segment).toBe('alternative-to-x');
    expect(worst.categoryRuns).toBe(3);
  });

  it('summary note references only a rendered segment — never a canned "enterprise" line', () => {
    const note = segmentSummaryNote(allZero);
    expect(note).toMatch(/Head-to-head \/ alternatives/);
    expect(note).toMatch(/N=3/);
    // The old canned copy always said "enterprise-framed"; enterprise is NOT a
    // rendered segment here, so the note must not mention it. (Proves the fix.)
    expect(note).not.toMatch(/enterprise/i);
  });

  it('names the winnable segment when one exists, and applies the label wrapper', () => {
    const stats = segmentBreakdown([
      run({ query: 'affordable AEO for startups', cited: true }),
      run({ query: 'free AEO checker for small business', cited: false }),
      run({ query: 'Profound vs Otterly', cited: false }),
      run({ query: 'alternatives to Profound', cited: false }),
    ]);
    const note = segmentSummaryNote(stats, (s) => `**${s}**`);
    expect(note).toMatch(/most winnable segment is \*\*SMB \/ affordable\*\*/);
  });

  it('falls back cleanly when there is no losing category segment to name', () => {
    expect(segmentSummaryNote([])).toBe('No segment is winning yet. Start where your positioning fits.');
    expect(largestLosingSegment([])).toBeNull();
  });
});
