import { describe, it, expect } from 'vitest';
import { verifyClaims, formatGateResult, type PublishedClaim, type ResolvedSweep } from '../lib/publicationGate';
import type { SweepRunResult } from '../lib/citationSweep';

/** The gate must FAIL CLOSED on every path. These tests assert the outcome —
 *  publication blocked — not that a helper was called.
 *
 *  The case that motivated it: the July 2026 branded figure of 98% was published
 *  and cannot be reproduced, because the baseline holds a summary with no
 *  transcripts. Test `blocks a sweep that has no stored transcripts` is that
 *  scenario exactly. */

const DOMAIN = 'example.com';

function run(over: Partial<SweepRunResult> = {}): SweepRunResult {
  return {
    engine: 'claude',
    query: 'who is example.com',
    queryType: 'branded',
    runIndex: 0,
    transcript: 'Example.com is a widget company. See https://example.com for details.',
    sources: ['https://example.com/about'],
    costUsd: 0,
    ...over,
  } as SweepRunResult;
}

/** Two branded runs, both cited -> 100% at N=2. */
function sweepOf(runs: SweepRunResult[]): ResolvedSweep {
  return { domain: DOMAIN, brand: 'Example', competitors: [], runs };
}

const claim = (over: Partial<PublishedClaim> = {}): PublishedClaim => ({
  location: 'public/blog/post/index.html',
  rendered: '100',
  sweepId: 'sweep-1',
  metric: 'brandedRetrievabilityPct',
  statedN: 2,
  ...over,
});

describe('publication gate fails closed', () => {
  it('passes when the figure recomputes from stored transcripts', async () => {
    const r = await verifyClaims([claim()], async () => sweepOf([run(), run({ runIndex: 1 })]));
    expect(r.ok).toBe(true);
    expect(r.checked).toBe(1);
    expect(formatGateResult(r)).toContain('PUBLICATION GATE PASSED');
  });

  it('blocks a sweep id that does not resolve', async () => {
    const r = await verifyClaims([claim()], async () => null);
    expect(r.ok).toBe(false);
    expect(r.failures[0].reason).toBe('sweep-not-found');
  });

  it('blocks a sweep that has no stored transcripts — the July 98% case', async () => {
    const r = await verifyClaims([claim()], async () => sweepOf([]));
    expect(r.ok).toBe(false);
    expect(r.failures[0].reason).toBe('no-transcripts');
    expect(formatGateResult(r)).toContain('Nothing is published');
  });

  it('blocks when the rendered figure disagrees with the transcripts', async () => {
    // Two runs, one cited and one not => 50%, but the content claims 100%.
    const notCited = run({
      runIndex: 1,
      transcript: 'I could not find any information matching that request.',
      sources: [],
    });
    const r = await verifyClaims([claim()], async () => sweepOf([run(), notCited]));
    expect(r.ok).toBe(false);
    expect(r.failures[0].reason).toBe('value-mismatch');
    expect(r.failures[0].detail).toMatch(/renders 100/);
  });

  it('blocks when N disagrees, even if the percentage matches', async () => {
    // A figure without its true N is half a claim.
    const r = await verifyClaims([claim({ statedN: 40 })], async () => sweepOf([run(), run({ runIndex: 1 })]));
    expect(r.ok).toBe(false);
    expect(r.failures[0].reason).toBe('n-mismatch');
  });

  it('blocks when the resolver throws rather than treating an outage as a pass', async () => {
    const r = await verifyClaims([claim()], async () => {
      throw new Error('database unreachable');
    });
    expect(r.ok).toBe(false);
    expect(r.failures[0].reason).toBe('sweep-not-found');
    expect(r.failures[0].detail).toContain('database unreachable');
  });

  it('reports every failing figure, not just the first', async () => {
    const claims = [claim({ location: 'a.html' }), claim({ location: 'b.html', sweepId: 'sweep-2' })];
    const r = await verifyClaims(claims, async () => null);
    expect(r.checked).toBe(2);
    expect(r.failures.map((f) => f.location)).toEqual(['a.html', 'b.html']);
  });
});
