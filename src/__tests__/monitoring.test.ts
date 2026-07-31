import { describe, it, expect } from 'vitest';
import { aggregateAuthorityGap } from '../lib/authorityGap';
import { computePickRate } from '../lib/pickRate';
import { diffTruthRecords } from '../lib/driftDiff';
import type { TruthRecord } from '../lib/truthRecord';

describe('authorityGap (WO-7)', () => {
  it('ranks third-party sources, excludes the client, flags known authorities', () => {
    const runs = [
      { engine: 'perplexity', sources: ['https://en.wikipedia.org/x', 'https://g2.com/y', 'https://aeoanalyzers.com/self'] },
      { engine: 'perplexity', sources: ['https://g2.com/z', 'https://randomblog.com/a'] },
      { engine: 'claude', sources: ['https://g2.com/w'] },
    ];
    const rep = aggregateAuthorityGap(runs, 'aeoanalyzers.com');
    const domains = rep.authorityDomains.map((d) => d.domain);
    expect(domains).not.toContain('aeoanalyzers.com'); // client excluded
    expect(rep.authorityDomains[0].domain).toBe('g2.com'); // most-cited first
    expect(rep.authorityDomains[0].citations).toBe(3);
    expect(rep.authorityDomains.find((d) => d.domain === 'g2.com')!.isKnownAuthority).toBe(true);
    expect(rep.recommendations.join(' ')).toMatch(/g2\.com|wikipedia/i);
  });

  it('excludes the Gemini grounding-redirect wrapper from authority sources', () => {
    const runs = [
      { engine: 'gemini', sources: ['https://vertexaisearch.cloud.google.com/grounding-api-redirect/ABC', 'https://g2.com/y'] },
      { engine: 'gemini', sources: ['https://vertexaisearch.cloud.google.com/grounding-api-redirect/DEF'] },
    ];
    const rep = aggregateAuthorityGap(runs, 'aeoanalyzers.com');
    expect(rep.authorityDomains.map((d) => d.domain)).not.toContain('vertexaisearch.cloud.google.com');
    expect(rep.authorityDomains[0]?.domain).toBe('g2.com');
  });
});

describe('pickRate (WO-4)', () => {
  it('joins crawl volume with citation win and surfaces the honesty gap', () => {
    const rep = computePickRate(
      { 'OpenAI (ChatGPT)': 90, 'Anthropic (Claude)': 10 },
      { 'OpenAI (ChatGPT)': 20, 'Anthropic (Claude)': 80 }
    );
    expect(rep.rows[0].company).toBe('OpenAI (ChatGPT)'); // sorted by crawl
    expect(rep.rows[0].crawlSharePct).toBe(90);
    expect(rep.rows[0].citationWinPct).toBe(20); // heavy crawl, low cite
    expect(rep.caption).toMatch(/not endorsement/i);
  });
});

describe('driftDiff (WO-5)', () => {
  const base: TruthRecord = { brandName: 'AEO Analyzers', founders: ['Lindsay Hiebert'], sameAs: ['https://linkedin.com/in/x'], facts: [] };

  it('reports in-sync when identical', () => {
    expect(diffTruthRecords(base, { ...base }).inSync).toBe(true);
  });

  it('flags a wiped founder as high-severity drift', () => {
    const current: TruthRecord = { ...base, founders: [] };
    const rep = diffTruthRecords(base, current);
    expect(rep.inSync).toBe(false);
    const d = rep.drifts.find((x) => x.field === 'founder' && x.type === 'removed');
    expect(d?.severity).toBe('high');
    expect(d?.before).toBe('Lindsay Hiebert');
  });

  it('flags a changed brand name and a newly-added founder', () => {
    const current: TruthRecord = { brandName: 'AEO Analyzer', founders: ['Lindsay Hiebert', 'Jesper Nissen'], sameAs: base.sameAs, facts: [] };
    const rep = diffTruthRecords(base, current);
    expect(rep.drifts.some((d) => d.field === 'brandName' && d.type === 'changed')).toBe(true);
    expect(rep.drifts.some((d) => d.field === 'founder' && d.type === 'added' && d.after === 'Jesper Nissen')).toBe(true);
  });
});
