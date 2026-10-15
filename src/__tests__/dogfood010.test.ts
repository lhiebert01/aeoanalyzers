// WO-AEO-DOGFOOD-FIXES-010 — regression tests built from the 15 Oct 2026 dogfood sweep.
import { describe, it, expect } from 'vitest';
import { extractPriceClaims, extractFreeAllowance, publishedPrices, ownSiteRecordAt } from '../lib/siteFacts';
import { accuracyWhenNamed, sitePublishedIssues } from '../lib/fidelity';
import { withSiteRecord, extractTruthRecord, type TruthRecord } from '../lib/truthRecord';
import { extractBeliefs, flaggedWrongValues, flaggedSiteValues } from '../lib/beliefs';
import { detectEntityLinkingFailures } from '../lib/entityLinking';
import { coreName, isEngineName, effectiveCompetitorSet } from '../lib/citationSweep';
import { displayQuestion } from '../lib/sweepActions';
import { applyAccuracyGuards } from '../services/geminiService';

// The Claude answer from the dogfood, verbatim shape (line breaks as stored).
const CLAUDE = 'AEO Analyzers (aeoanalyzers.com) is a tool for Answer Engine Optimization.\n. \nIt offers a free check, $24 Day Pass, $49/mo Pro, and $199/mo Business pricing\n.';
const BASE: TruthRecord = { brandName: 'AEO Analyzers', founders: ['Lindsay Hiebert'], sameAs: [], facts: [] };
const AFTER = '2026-10-15T05:04:00Z';
const BEFORE = '2026-10-13T20:34:00Z';

describe('A — prices are read as whole claims', () => {
  it('"$49/mo Pro" is one claim, never the fragment "mo Pro"; funding is not a price', () => {
    expect(extractPriceClaims(CLAUDE).map((c) => c.claim)).toEqual(['$24 Day Pass', '$49/mo Pro', '$199/mo Business']);
    expect(extractPriceClaims('It raised $5 million and $2.5B')).toEqual([]);
  });
  it('a free allowance needs a number', () => {
    expect(extractFreeAllowance('you get 3 free checks')?.count).toBe(3);
    expect(extractFreeAllowance('a free check')).toBeNull();
  });
  it('the pricing page is read for published prices; aggregate bounds alone do not make a price check', () => {
    const page = '<html><body><h3>Day Pass</h3><span>$29</span> / 24h <h3>Pro</h3> $149/mo <p>3 free checks</p></body></html>';
    expect(publishedPrices([], page).map((p) => p.amount)).toEqual([29, 149]);
    const aggOnly = extractTruthRecord('<script type="application/ld+json">{"@type":"SoftwareApplication","name":"X","offers":{"@type":"AggregateOffer","lowPrice":"0","highPrice":"599"}}</script>');
    expect(aggOnly.prices).toBeUndefined();
    const withPage = extractTruthRecord('<html></html>', null, page);
    expect(withPage.prices?.map((p) => p.amount)).toEqual([29, 149]);
    expect(withPage.freeAllowance).toBe(3);
  });
});

describe('A — described accurately now covers prices, allowance and retired names', () => {
  it('the dogfood answer is drifted under the site of 15 Oct, with the site value beside each claim', () => {
    const truth = withSiteRecord(BASE, 'aeoanalyzers.com', AFTER)!;
    const issues = sitePublishedIssues(CLAUDE, truth);
    expect(issues.map((i) => i.wrong)).toEqual(['$24 Day Pass', '$49/mo Pro', '$199/mo Business']);
    expect(issues[1].correct).toContain('$149/mo Pro Optimizer');
    const a = accuracyWhenNamed([{ cited: true, transcript: CLAUDE }, { cited: true, transcript: 'AEO Analyzers, founded by Lindsay Hiebert.' }], truth)!;
    expect([a.accurate, a.named]).toEqual([1, 2]);
    expect(a.definition).toContain('your prices');
  });
  it('the same answer was accurate on 13 Oct, when those were the prices', () => {
    const truth = withSiteRecord(BASE, 'aeoanalyzers.com', BEFORE)!;
    expect(sitePublishedIssues(CLAUDE, truth)).toEqual([]);
  });
  it('a price about a rival in the same answer is not a claim about the customer', () => {
    const truth = withSiteRecord(BASE, 'aeoanalyzers.com', AFTER)!;
    expect(sitePublishedIssues('AEO Analyzers costs $29 for a Day Pass. Rival X starts at $499/mo.', truth)).toEqual([]);
  });
  it('a retired name counts only after the site stopped saying it; other domains get no guessed record', () => {
    expect(ownSiteRecordAt('aeoanalyzers.com', '2026-10-13T00:00:00Z')!.retiredNames).not.toContain('AI Simulation Engine');
    expect(ownSiteRecordAt('aeoanalyzers.com', '2026-10-16T00:00:00Z')!.retiredNames).toContain('AI Simulation Engine');
    expect(ownSiteRecordAt('example.com', AFTER)).toBeNull();
    expect(withSiteRecord(BASE, 'example.com', AFTER)).toBe(BASE);
  });
  it('the beliefs table shows the price row as contradicting the site, with the site value', () => {
    const truth = withSiteRecord(BASE, 'aeoanalyzers.com', AFTER)!;
    const fidelity = { issues: sitePublishedIssues(CLAUDE, truth) };
    const rows = extractBeliefs([{ engine: 'claude', queryType: 'branded', transcript: CLAUDE } as any], 'AEO Analyzers', flaggedWrongValues(fidelity), flaggedSiteValues(fidelity));
    const price = rows.find((r) => r.claim === '$49/mo Pro')!;
    expect(price.field).toBe('Price');
    expect(price.status).toBe('Contradicts your site');
    expect(price.siteValue).toContain('$149/mo Pro Optimizer');
    expect(rows.some((r) => /^mo /.test(r.claim))).toBe(false);
  });
});

describe('B — retrieved alongside is not confusion', () => {
  const wiki = 'https://en.wikipedia.org/wiki/AEA_Investors';
  const truth = withSiteRecord(BASE, 'aeoanalyzers.com', BEFORE)!;
  it('a Wikipedia page only in the sources of an accurate answer is listed, not flagged', () => {
    const rep = detectEntityLinkingFailures([{ cited: true, transcript: 'AEO Analyzers, founded by Lindsay Hiebert.', sources: ['https://aeoanalyzers.com', wiki] }], { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' }, truth);
    expect(rep.collisions).toEqual([]);
    expect(rep.retrievedAlongside?.map((a) => a.entity)).toEqual(['Wikipedia: aea investors']);
  });
  it('it is confusion when the answer names the other entity', () => {
    const rep = detectEntityLinkingFailures([{ cited: true, transcript: 'AEO Analyzers, part of AEA Investors.', sources: [wiki] }], { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' }, truth);
    expect(rep.collisions).toEqual(['Wikipedia: aea investors']);
  });
  it('it stays confusion when the answer was not accurate about you', () => {
    const t2 = withSiteRecord(BASE, 'aeoanalyzers.com', AFTER)!;
    const rep = detectEntityLinkingFailures([{ cited: true, transcript: CLAUDE, sources: [wiki] }], { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' }, t2);
    expect(rep.collisions).toEqual(['Wikipedia: aea investors']);
  });
});

describe('G — competitors and questions as the reader sees them', () => {
  it('"Otterly", "Otterly AI" and otterly.ai are one vendor; engines are never competitors', () => {
    expect(new Set(['Otterly AI', 'Otterly', 'otterly.ai'].map(coreName)).size).toBe(1);
    expect(['Claude', 'ChatGPT', 'Gemini', 'Grok', 'Perplexity'].every(isEngineName)).toBe(true);
    expect(isEngineName('Profound')).toBe(false);
    const runs = [{ engine: 'claude', query: 'best tools', queryType: 'category', runIndex: 0, costUsd: 0, grounding: 'search-grounded',
      transcript: 'Try Otterly (otterly.ai), Profound (tryprofound.com) or Claude (claude.ai).', sources: ['https://otterly.ai', 'https://tryprofound.com', 'https://claude.ai'] }] as any;
    const set = effectiveCompetitorSet(runs, { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' }, [{ name: 'Otterly AI' }]);
    expect(set.filter((c) => coreName(c.name) === 'otterly')).toHaveLength(1);
    expect(set.some((c) => isEngineName(c.name))).toBe(false);
  });
  it('the content agenda drops the market suffix the sweep appended', () => {
    expect(displayQuestion('affordable AI search monitoring tools for startups in United States', 'United States')).toBe('affordable AI search monitoring tools for startups');
    expect(displayQuestion('tools in the United States market', null)).toBe('tools in the United States market');
  });
});

describe('E — the AEO Score report does not contradict its own scan', () => {
  it('no crawler-access item at 100, no llms.txt item when one was found', () => {
    const result: any = {
      score: 90, summary: '', recommendations: ['Add an llms.txt file', 'Tighten H2 answers'],
      implementationChecklist: [
        { category: 'Technical', action: 'Ensure GPTBot, ClaudeBot and PerplexityBot have full access in robots.txt', priority: 'HIGH' },
        { category: 'Coverage', action: 'Provide an optional /llms.txt file', priority: 'LOW' },
        { category: 'Structural', action: 'Follow question H2s with entity-named answers', priority: 'MEDIUM' },
      ],
      crawlerAccess: { score: 100, criticalBlock: false, llmsTxtFound: true, recommendations: [], summary: '' },
    };
    const out = applyAccuracyGuards(result, { type: 'saas', signals: [] } as any);
    expect(out.implementationChecklist!.map((i: any) => i.priority)).toEqual(['MEDIUM']);
    expect(out.recommendations).toEqual(['Tighten H2 answers']);
  });
});
