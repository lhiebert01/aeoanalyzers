// Regression suite for the WO-1 citation-sweep analytical core. Pins the
// grounded (LLM-free) citation/competitor detection and the three-layer roll-up.

import { describe, it, expect } from 'vitest';
import {
  normalizeDomain,
  containsWord,
  domainCited,
  scoreRun,
  aggregateSweep,
  sweepScorecard,
  detectCompetitors,
  isTruncatedText,
  isModelPrior,
  type SweepRunResult,
} from '../lib/citationSweep';

describe('normalizeDomain', () => {
  it('strips protocol, www, path, query, and port', () => {
    expect(normalizeDomain('https://www.Foo.com/bar?x=1')).toBe('foo.com');
    expect(normalizeDomain('http://foo.com:8080')).toBe('foo.com');
    expect(normalizeDomain('foo.com')).toBe('foo.com');
  });
});

describe('containsWord', () => {
  it('matches a brand as a whole word, case-insensitive', () => {
    expect(containsWord('We recommend Ford trucks.', 'ford')).toBe(true);
    expect(containsWord('AEO Analyzers is great', 'AEO Analyzers')).toBe(true);
  });
  it('does NOT match a brand embedded in another word', () => {
    // The classic false positive: "Ford" inside "afford".
    expect(containsWord('You can afford it.', 'Ford')).toBe(false);
  });
});

describe('domainCited', () => {
  it('detects the domain in the answer text', () => {
    expect(domainCited('See aeoanalyzers.com for details', [], 'aeoanalyzers.com')).toBe(true);
  });
  it('detects the domain as a source host, including subdomains', () => {
    expect(domainCited('no mention', ['https://blog.foo.com/x'], 'foo.com')).toBe(true);
    expect(domainCited('no mention', ['https://foo.com'], 'foo.com')).toBe(true);
  });
  it('does not match an unrelated domain', () => {
    expect(domainCited('bar.com is nice', ['https://bar.com'], 'foo.com')).toBe(false);
  });
});

const run = (over: Partial<SweepRunResult>): SweepRunResult => ({
  engine: 'perplexity', query: 'q', queryType: 'category', runIndex: 0,
  transcript: '', sources: [], costUsd: 0, ...over,
});

describe('scoreRun', () => {
  it('marks cited when the client domain appears', () => {
    const r = scoreRun(run({ transcript: 'Try aeoanalyzers.com' }), { domain: 'aeoanalyzers.com' }, []);
    expect(r.cited).toBe(true);
  });
  it('marks cited when the client brand name appears (no domain)', () => {
    const r = scoreRun(run({ transcript: 'AEO Analyzers audits your site' }), { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' }, []);
    expect(r.cited).toBe(true);
  });
  it('collects "cited instead" competitors by name and domain', () => {
    const r = scoreRun(
      run({ transcript: 'Rivals include Otterly and see peec.ai', sources: ['https://peec.ai/x'] }),
      { domain: 'aeoanalyzers.com' },
      [{ name: 'Otterly' }, { name: 'Peec', domain: 'peec.ai' }, { name: 'Nozzle' }]
    );
    expect(r.cited).toBe(false);
    expect(r.citedCompetitors).toEqual(expect.arrayContaining(['Otterly', 'Peec']));
    expect(r.citedCompetitors).not.toContain('Nozzle');
  });

  // --- not-found guard: an echoed domain inside a "couldn't find it" clause is a
  // retrieval FAILURE, not a citation. This is the real WO-1 bug — Claude reported
  // 8/8 branded retrievability on answers that said it could not find the site.
  it('does NOT count a domain echoed inside a "couldn\'t find it" clause', () => {
    const r = scoreRun(
      run({ transcript: "I couldn't find reliable information about quizshowdown.live, so I'd recommend Kahoot instead." }),
      { domain: 'quizshowdown.live', brand: 'Quiz Showdown' },
      []
    );
    expect(r.cited).toBe(false);
  });
  it('does NOT count a brand named only inside a not-found clause', () => {
    const r = scoreRun(
      run({ transcript: "I'm not familiar with Quiz Showdown and cannot confirm what it does." }),
      { domain: 'quizshowdown.live', brand: 'Quiz Showdown' },
      []
    );
    expect(r.cited).toBe(false);
  });
  it('still counts a domain the engine actually RETRIEVED as a source, even if the prose hedges', () => {
    const r = scoreRun(
      run({
        transcript: "I couldn't find much, but the site appears to be a live quiz tool.",
        sources: ['https://quizshowdown.live/?utm_source=openai'],
      }),
      { domain: 'quizshowdown.live', brand: 'Quiz Showdown' },
      []
    );
    expect(r.cited).toBe(true);
  });
  it('counts a genuine positive mention even when a LATER clause says "couldn\'t find" something else', () => {
    const r = scoreRun(
      run({ transcript: 'Quiz Showdown (quizshowdown.live) runs live quizzes. I could not find its exact seat pricing.' }),
      { domain: 'quizshowdown.live', brand: 'Quiz Showdown' },
      []
    );
    expect(r.cited).toBe(true);
  });
  it('does NOT count a competitor named only inside a not-found clause', () => {
    const r = scoreRun(
      run({ transcript: 'Quiz Showdown fits here. I could not find any tool called Slido for this.' }),
      { domain: 'quizshowdown.live', brand: 'Quiz Showdown' },
      [{ name: 'Slido' }]
    );
    expect(r.cited).toBe(true);
    expect(r.citedCompetitors).not.toContain('Slido');
  });

  // --- dogfood-surfaced cases (AEO-on-itself sweep, 2026-07-30). Client = AEO
  // Analyzers, whose name doubles as a generic noun and whose domain has no space.
  const AEO = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };

  it('does NOT count a brand echoed only in a search-narration preamble that then fails', () => {
    // Claude narrates "I'll search…", echoing the brand, then says it can't find it.
    const r = scoreRun(
      run({ transcript: 'I\'ll search for information about AEO Analyzers and which answer engines they test.\nI don\'t see a specific tool called "AEO Analyzers" in the results.' }),
      AEO, []
    );
    expect(r.cited).toBe(false);
  });
  it('does NOT count a "cannot confirm" answer that only echoes the domain from the question', () => {
    const r = scoreRun(
      run({ transcript: "The search results don't show specific information about aeoanalyzers.com itself. I cannot confirm whether aeoanalyzers.com is specifically an Answer Engine Optimization tool." }),
      AEO, []
    );
    expect(r.cited).toBe(false);
  });
  it('DOES count the brand written without a space ("AEOAnalyzers") — brand normalization', () => {
    const r = scoreRun(
      run({ transcript: 'AEOAnalyzers is a product built and operated by PIGENAI LLC that provides AI visibility scans across the four major answer engines.' }),
      AEO, []
    );
    expect(r.cited).toBe(true);
  });
  it('still counts a genuine positive mention even after a search-narration line', () => {
    const r = scoreRun(
      run({ transcript: 'Let me search for that. AEO Analyzers is a legitimate AEO tool at aeoanalyzers.com that runs live citation sweeps.' }),
      AEO, []
    );
    expect(r.cited).toBe(true);
  });
});

describe('aggregateSweep — three-layer roll-up', () => {
  const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
  const competitors = [{ name: 'Otterly' }];

  it('separates retrievability (branded) from citation win (category) and rounds', () => {
    const runs: SweepRunResult[] = [
      // Branded: 3/3 cited → retrievability 100%
      run({ engine: 'claude', queryType: 'branded', transcript: 'AEO Analyzers ...', costUsd: 0.01 }),
      run({ engine: 'claude', queryType: 'branded', transcript: 'aeoanalyzers.com ...', costUsd: 0.01 }),
      run({ engine: 'claude', queryType: 'branded', transcript: 'AEO Analyzers ...', costUsd: 0.01 }),
      // Category: 1/3 cited → citation win 33%
      run({ engine: 'claude', queryType: 'category', transcript: 'AEO Analyzers is one option', costUsd: 0.01 }),
      run({ engine: 'claude', queryType: 'category', transcript: 'Otterly is best', costUsd: 0.01 }),
      run({ engine: 'claude', queryType: 'category', transcript: 'Use Otterly', costUsd: 0.01 }),
    ];
    const summary = aggregateSweep(runs, client, competitors);
    const claude = summary.engines.find((e) => e.engine === 'claude')!;
    expect(claude.retrievabilityPct).toBe(100);
    expect(claude.citationWinPct).toBe(33);
    // Competitor displacement counted only on the 2 category runs that named Otterly.
    expect(claude.competitorCounts.Otterly).toBe(2);
    expect(summary.topCompetitors[0]).toEqual({ name: 'Otterly', count: 2 });
    expect(summary.totalRuns).toBe(6);
    expect(summary.totalCostUsd).toBeCloseTo(0.06, 5);
  });

  it('does not count competitor displacement on branded queries', () => {
    const runs: SweepRunResult[] = [
      run({ engine: 'gemini', queryType: 'branded', transcript: 'Otterly also exists', costUsd: 0 }),
    ];
    const summary = aggregateSweep(runs, client, competitors);
    const gem = summary.engines.find((e) => e.engine === 'gemini')!;
    expect(gem.competitorCounts.Otterly).toBeUndefined();
    expect(summary.topCompetitors).toHaveLength(0);
  });
});

describe('scoreRun — domainCited (own domain vs brand-only mention)', () => {
  const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
  it('is true when the domain is surfaced in text or sources', () => {
    expect(scoreRun(run({ transcript: 'see aeoanalyzers.com' }), client, []).domainCited).toBe(true);
    expect(scoreRun(run({ transcript: 'great tool', sources: ['https://aeoanalyzers.com/'] }), client, []).domainCited).toBe(true);
  });
  it('is false when only the brand NAME is mentioned (no domain)', () => {
    const r = scoreRun(run({ transcript: 'AEO Analyzers is a solid option' }), client, []);
    expect(r.cited).toBe(true);        // brand mention → cited
    expect(r.domainCited).toBe(false); // but the site itself was not surfaced
  });
});

describe('sweepScorecard — five buyer-facing scores + plain summary', () => {
  const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
  const competitors = [{ name: 'Profound', domain: 'tryprofound.com' }];
  const runs: SweepRunResult[] = [
    run({ queryType: 'branded', transcript: 'AEO Analyzers is great' }),          // cited, no domain
    run({ queryType: 'branded', transcript: 'see aeoanalyzers.com for details' }), // cited + domain
    run({ queryType: 'category', transcript: 'Try AEO Analyzers or Profound' }),   // cited + competitor
    run({ queryType: 'category', transcript: 'Use Profound' }),                    // not cited, competitor
  ];

  it('computes retrievability, category win, owned-citation rate, and competitive share', () => {
    const sc = sweepScorecard(runs, client, competitors);
    expect(sc.brandedRetrievabilityPct).toBe(100);        // 2/2 branded cited
    expect(sc.categoryRecommendationWinPct).toBe(50);     // 1/2 category cited
    expect(sc.ownedCitationRatePct).toBe(33);             // 1 of 3 surfaced runs cited the domain
    expect(sc.competitiveSharePct).toBe(33);              // 1 brand rec / (1 + 2 Profound)
    expect(sc.topCompetitors[0]).toEqual({ name: 'Profound', count: 2 });
  });

  it('writes a plain-English summary that names the numbers and the top competitor', () => {
    const { plainSummary } = sweepScorecard(runs, client, competitors);
    expect(plainSummary).toContain('AEO Analyzers');
    expect(plainSummary).toContain('100%');
    expect(plainSummary).toContain('50%');
    expect(plainSummary).toMatch(/Profound wins most often \(2×\)/);
  });

  it('reports 0% category win in plain English when nothing is recommended', () => {
    const zero = sweepScorecard(
      [run({ queryType: 'category', transcript: 'Use Profound' })],
      client, competitors
    );
    expect(zero.categoryRecommendationWinPct).toBe(0);
    expect(zero.plainSummary).toContain('does not yet recommend');
  });

  it('does NOT flag auto-detection when the user supplied competitors', () => {
    expect(sweepScorecard(runs, client, competitors).competitorsAutoDetected).toBe(false);
  });
});

describe('detectCompetitors — mine rivals from the category answers', () => {
  const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
  const runs: SweepRunResult[] = [
    run({ queryType: 'category', transcript: 'Profound (tryprofound.com) and Scrunch (scrunch.com) lead.',
      sources: ['https://www.reddit.com/r/seo', 'https://tryprofound.com/blog'] }),
    run({ queryType: 'category', transcript: 'Try tryprofound.com or otterly.ai for tracking.',
      sources: ['https://en.wikipedia.org/wiki/SEO', 'https://www.reddit.com/r/aeo'] }),
    run({ queryType: 'category', transcript: 'scrunch.com is the enterprise pick.',
      sources: ['https://en.wikipedia.org/wiki/AEO'] }),
    // A BRANDED run — must be ignored (its domains are the client, not rivals).
    run({ queryType: 'branded', transcript: 'aeoanalyzers.com is by pigenai.com', sources: ['https://pigenai.com'] }),
  ];

  it('surfaces domains that recur across category runs, excluding own + authority hosts', () => {
    const detected = detectCompetitors(runs, client).map((c) => c.domain);
    expect(detected).toContain('tryprofound.com'); // 2 runs (source + text)
    expect(detected).toContain('scrunch.com');     // 2 runs (text + text)
    expect(detected).not.toContain('aeoanalyzers.com'); // own domain
    expect(detected).not.toContain('pigenai.com');      // only in a branded run
    expect(detected).not.toContain('reddit.com');       // stoplisted authority host
    expect(detected).not.toContain('wikipedia.org');    // stoplisted authority host
  });

  it('ignores a domain seen in only one run (below the frequency threshold)', () => {
    const detected = detectCompetitors(runs, client).map((c) => c.domain);
    expect(detected).not.toContain('otterly.ai'); // appears once
    // ...but a lower threshold DOES pick it up (grounded — it is really there).
    expect(detectCompetitors(runs, client, { minRuns: 1 }).map((c) => c.domain)).toContain('otterly.ai');
  });

  it('sweepScorecard falls back to detected competitors so Share of Model still computes', () => {
    const sc = sweepScorecard(runs, client, []); // no competitors provided
    expect(sc.competitorsAutoDetected).toBe(true);
    expect(sc.competitiveSharePct).not.toBeNull();
    expect(sc.topCompetitors.map((c) => c.name)).toContain('tryprofound.com');
  });
});

describe('truncation (WO-QA-003 A1) — cut-off answers are unmeasured, not zero', () => {
  it('isTruncatedText: complete answers pass; cut-off answers flag', () => {
    expect(isTruncatedText('')).toBe(true);                                  // empty
    expect(isTruncatedText('Top tools: Profound and Scrunch.')).toBe(false); // ends on period
    expect(isTruncatedText('Best options are Peec (peec.ai)')).toBe(false);  // ends on closing paren
    expect(isTruncatedText('For tracking, try peec.ai')).toBe(false);        // ends on a bare domain
    expect(isTruncatedText('aeoanalyzers.com is an Answer Engine Optimization')).toBe(true); // cut mid-phrase
  });

  it('sweepScorecard excludes a truncated run from the denominators', () => {
    const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
    const sc = sweepScorecard([
      run({ queryType: 'category', transcript: 'AEO Analyzers is a good pick.' }),          // scored
      run({ queryType: 'category', transcript: 'partial answer cut off', truncated: true }), // excluded
    ], client, []);
    expect(sc.categoryRuns).toBe(1);                 // only the non-truncated run counts
    expect(sc.categoryRecommendationWinPct).toBe(100); // 1/1, not 1/2
  });

  it('aggregateSweep counts truncated runs and blocks a column past the ratio', () => {
    const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
    // 5 branded runs, 2 truncated → 40% > 20% → blocked.
    const blocked = aggregateSweep([
      run({ engine: 'gemini', queryType: 'branded', transcript: 'AEO Analyzers by PI GenAI LLC.' }),
      run({ engine: 'gemini', queryType: 'branded', transcript: 'aeoanalyzers.com is a tool.' }),
      run({ engine: 'gemini', queryType: 'branded', transcript: 'AEO Analyzers helps.' }),
      run({ engine: 'gemini', queryType: 'branded', transcript: 'aeoanalyzers.com is an Answer', truncated: true }),
      run({ engine: 'gemini', queryType: 'branded', transcript: 'AEO Analyzers is a', truncated: true }),
    ], client, []);
    const g = blocked.engines[0];
    expect(g.truncatedRuns).toBe(2);
    expect(g.brandedRuns).toBe(3);       // truncated excluded from the score base
    expect(g.truncatedBlocked).toBe(true);
  });
});

describe('model-prior vs search-grounded (WO-QA-003 A2)', () => {
  const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };

  it('isModelPrior: only model-prior / indeterminate count as prior; absent = grounded', () => {
    expect(isModelPrior(run({ grounding: 'model-prior' }))).toBe(true);
    expect(isModelPrior(run({ grounding: 'indeterminate' }))).toBe(true);
    expect(isModelPrior(run({ grounding: 'search-grounded' }))).toBe(false);
    expect(isModelPrior(run({}))).toBe(false); // undefined → grounded (back-compat)
  });

  it('sweepScorecard keeps model-prior runs out of category win and reports them separately', () => {
    const sc = sweepScorecard([
      run({ queryType: 'category', transcript: 'AEO Analyzers is a good pick.', grounding: 'search-grounded' }), // grounded, cited
      run({ queryType: 'category', transcript: 'Use Profound instead.', grounding: 'search-grounded' }),         // grounded, not cited
      run({ queryType: 'category', transcript: 'AEO Analyzers works well.', grounding: 'model-prior' }),         // prior, cited
    ], client, []);
    expect(sc.categoryRuns).toBe(2);                    // grounded only
    expect(sc.categoryRecommendationWinPct).toBe(50);   // 1/2 grounded, NOT 2/3
    expect(sc.modelPriorRuns).toBe(1);
    expect(sc.modelPriorVisibilityPct).toBe(100);       // 1/1 model-prior cited
  });

  it('aggregateSweep computes citation-win on grounded runs only', () => {
    const agg = aggregateSweep([
      run({ engine: 'openai', queryType: 'category', transcript: 'AEO Analyzers is good.', grounding: 'search-grounded' }),
      run({ engine: 'openai', queryType: 'category', transcript: 'Try Ahrefs.', grounding: 'model-prior' }),
    ], client, []);
    const e = agg.engines[0];
    expect(e.categoryRuns).toBe(1);       // grounded only
    expect(e.modelPriorRuns).toBe(1);
    expect(e.citationWinPct).toBe(100);   // 1/1 grounded cited, not 1/2
  });
});
