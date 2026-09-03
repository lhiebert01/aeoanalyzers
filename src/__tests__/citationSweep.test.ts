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
  isErroredRun,
  confidenceLevel,
  wilsonInterval,
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
    // Domains NAMED in the answer text are recommendations (rivals); domains only in
    // `sources` (a listicle the engine consulted) are deliberately ignored.
    run({ queryType: 'category', transcript: 'Profound (tryprofound.com) and Scrunch (scrunch.com) lead — see reddit.com.',
      sources: ['https://nicklafferty.com/blog/best-tools'] }),
    run({ queryType: 'category', transcript: 'Try tryprofound.com or otterly.ai; discussed on reddit.com and en.wikipedia.org.',
      sources: ['https://nicklafferty.com/blog/more'] }),
    run({ queryType: 'category', transcript: 'scrunch.com is the enterprise pick, per en.wikipedia.org.' }),
    // A BRANDED run — must be ignored (its domains are the client, not rivals).
    run({ queryType: 'branded', transcript: 'aeoanalyzers.com is by pigenai.com', sources: ['https://pigenai.com'] }),
  ];

  it('surfaces domains NAMED in the text, excluding own + authority hosts + source-only listicles', () => {
    const detected = detectCompetitors(runs, client).map((c) => c.domain);
    expect(detected).toContain('tryprofound.com'); // named in 2 runs' text
    expect(detected).toContain('scrunch.com');     // named in 2 runs' text
    expect(detected).not.toContain('aeoanalyzers.com'); // own domain
    expect(detected).not.toContain('pigenai.com');      // only in a branded run
    expect(detected).not.toContain('reddit.com');       // stoplisted authority host
    expect(detected).not.toContain('wikipedia.org');    // stoplisted authority host
    expect(detected).not.toContain('nicklafferty.com'); // source-only listicle, never named in text
  });

  it('maps known rival domains to clean display names', () => {
    const byDomain = new Map(detectCompetitors(runs, client).map((c) => [c.domain, c.name]));
    expect(byDomain.get('tryprofound.com')).toBe('Profound');
    expect(byDomain.get('scrunch.com')).toBe('Scrunch');
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
    expect(sc.topCompetitors.map((c) => c.name)).toContain('Profound');
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

describe('branded false-positive (WO-AEO-SWEEP-MEMORY-001) — "search ran, site not found" is a MISS', () => {
  const client = { domain: 'lanternpost.app', brand: 'Lantern Post' };
  const collisionSources = [
    'https://mylanternapp.com/', 'https://lantern.io/en/download', 'https://lantern.en.aptoide.com/app',
  ];

  it('the exact Claude c9d75643 transcript scores NOT cited (site not found), not a false positive', () => {
    const t = "The search results don't show a specific website or service at lanternpost.app. " +
      "The closest matches are My Lantern App (mylanternapp.com), which helps you lock, schedule, and organize income, " +
      "or Lantern (lantern.io), an application that allows you to bypass firewalls. " +
      "Could you provide more context about what lanternpost.app does or what you're looking for?";
    const r = scoreRun(run({ queryType: 'branded', transcript: t, sources: collisionSources }), client, []);
    expect(r.cited).toBe(false);          // was TRUE before the fix (the clarifying-question clause)
    expect((r as any).siteNotFound).toBe(true);
  });

  it('a real positive description still scores cited', () => {
    const r = scoreRun(run({ queryType: 'branded', transcript: 'Lantern Post (lanternpost.app) is a free e-card service that sends a card with a song.', sources: [] }), client, []);
    expect(r.cited).toBe(true);
    expect((r as any).siteNotFound).toBe(false);
  });

  it('real retrieval wins: the domain in SOURCES counts as cited even if the prose hedges', () => {
    const r = scoreRun(run({ queryType: 'branded', transcript: "I couldn't find much about lanternpost.app.", sources: ['https://lanternpost.app/'] }), client, []);
    expect(r.cited).toBe(true);
    expect((r as any).siteNotFound).toBe(false); // domain in sources → never "site not found"
  });
});

describe('errored runs (WO-AEO-SWEEP-MEMORY-001) — failed calls are unmeasured, not zero', () => {
  const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };

  it('isErroredRun: detects the explicit flag AND the stored "[error:" sentinel (retroactive)', () => {
    expect(isErroredRun(run({ errored: true }))).toBe(true);
    expect(isErroredRun(run({ transcript: '[error: Perplexity 429: rate limit]' }))).toBe(true); // no flag → detected from transcript
    expect(isErroredRun(run({ transcript: 'AEO Analyzers is a tool.' }))).toBe(false);
  });

  it('sweepScorecard excludes an errored run from the denominators (not a real not-cited)', () => {
    const sc = sweepScorecard([
      run({ queryType: 'branded', transcript: 'aeoanalyzers.com is an AEO tool.' }),  // scored, cited
      run({ queryType: 'branded', errored: true, transcript: '[error: Perplexity 429]' }), // excluded
    ], client, []);
    expect(sc.brandedRuns).toBe(1);              // only the valid run counts (NOT 2)
    expect(sc.brandedRetrievabilityPct).toBe(100); // 1/1, not 1/2=50
    expect(sc.erroredRuns).toBe(1);
  });

  it('aggregateSweep counts errored runs, excludes them from the score base, and computes % on valid N', () => {
    const s = aggregateSweep([
      run({ engine: 'perplexity', queryType: 'branded', transcript: 'AEO Analyzers is a tool.' }), // cited
      run({ engine: 'perplexity', queryType: 'branded', errored: true, transcript: '[error: 429]' }), // excluded
      run({ engine: 'perplexity', queryType: 'branded', errored: true, transcript: '[error: 429]' }), // excluded
    ], client, []);
    const p = s.engines[0];
    expect(p.erroredRuns).toBe(2);
    expect(p.brandedRuns).toBe(1);          // errored excluded from the score base
    expect(p.retrievabilityPct).toBe(100);  // 1/1 — NOT 1/3=33
    expect(p.insufficientValid).toBe(false);
  });

  it('an engine whose runs ALL errored is insufficientValid, not 0%', () => {
    const s = aggregateSweep([
      run({ engine: 'perplexity', queryType: 'category', transcript: '[error: 429]' }), // sentinel, no flag
      run({ engine: 'perplexity', queryType: 'branded', transcript: '[error: 429]' }),
    ], client, []);
    const p = s.engines[0];
    expect(p.erroredRuns).toBe(2);
    expect(p.brandedRuns + p.categoryRuns).toBe(0);
    expect(p.insufficientValid).toBe(true); // UI shows "insufficient valid runs", never 0%
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

describe('sample size & confidence (WO-QA-003 A3)', () => {
  it('confidenceLevel: N<3 low, 3–4 med, >=5 high', () => {
    expect(confidenceLevel(1)).toBe('low');
    expect(confidenceLevel(2)).toBe('low');
    expect(confidenceLevel(3)).toBe('med');
    expect(confidenceLevel(4)).toBe('med');
    expect(confidenceLevel(5)).toBe('high');
    expect(confidenceLevel(20)).toBe('high');
  });

  it('wilsonInterval: stays within [0,100] and widens at small N', () => {
    expect(wilsonInterval(0, 0)).toEqual({ low: 0, high: 0 });
    const two = wilsonInterval(2, 2);   // 100% at N=2 — interval must reach well below 100
    expect(two.high).toBe(100);
    expect(two.low).toBeLessThan(60);   // small N ⇒ big uncertainty
    const fifty = wilsonInterval(1, 2); // 50% at N=2
    expect(fifty.low).toBeGreaterThanOrEqual(0);
    expect(fifty.high).toBeLessThanOrEqual(100);
    expect(fifty.low).toBeLessThan(fifty.high);
  });

  it('exposes the N behind Owned Citation + Competitive Share', () => {
    const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
    const sc = sweepScorecard([
      run({ queryType: 'branded', transcript: 'AEO Analyzers is great' }),
      run({ queryType: 'branded', transcript: 'see aeoanalyzers.com' }),
    ], client, []);
    expect(sc.ownedCitationN).toBe(2);      // both branded runs surfaced the brand
    expect(sc.competitiveShareN).toBe(0);   // no category runs
  });

  it('plain summary hedges low-N claims instead of over-claiming certainty', () => {
    const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
    const { plainSummary } = sweepScorecard([
      run({ queryType: 'branded', transcript: 'AEO Analyzers is great' }),
      run({ queryType: 'branded', transcript: 'see aeoanalyzers.com' }),
    ], client, []);
    expect(plainSummary).toContain('early signal, N=2');
    expect(plainSummary).toContain('appears to find');
    expect(plainSummary).not.toContain('reliably finds');
  });
});
