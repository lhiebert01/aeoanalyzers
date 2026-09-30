import { describe, it, expect } from 'vitest';
import { doNowChecklist, NO_DO_NOW } from '../lib/doNowChecklist';
import { buildSweepActionAgenda, remediationSnippet } from '../lib/sweepActions';
import { detectEntityLinkingFailures } from '../lib/entityLinking';
import { generateSchema } from '../lib/schemaGenerator';

/** WO-AEO-REPORT-POLISH-001 Lane G — two leaks, each with a prove-by-breaking case. */
describe('G1 — the Do-now checklist carries receipts and never shows a generic roster', () => {
  const nybsys = [ // the real 2026-09-30 category-source counts
    { domain: 'sourceforge.net', citations: 7, engines: ['claude', 'perplexity'] },
    { domain: 'linkedin.com',    citations: 4, engines: ['perplexity'] },
    { domain: 'trustpilot.com',  citations: 3, engines: ['perplexity'] },
    { domain: 'ericsson.com',    citations: 16, engines: ['claude', 'openai'] }, // earned tier, not do-now
  ];
  it('keeps a domain cited by two engines, or three times; drops a one-engine, one-question directory', () => {
    const list = doNowChecklist(nybsys);
    expect(list.some((l) => l.startsWith('sourceforge.net (7 citations, Claude + Perplexity)'))).toBe(true);
    expect(list.some((l) => l.startsWith('trustpilot.com (3 citations, Perplexity)'))).toBe(true); // 3 citations qualifies, receipt shown
    expect(list.some((l) => l.startsWith('linkedin.com (4 citations, Perplexity)'))).toBe(true);   // 4 citations clears the 3-citation bar; the receipt shows it was one engine
  });
  it('PROVE BY BREAKING: one engine, two citations never qualifies', () => {
    expect(doNowChecklist([{ domain: 'trustpilot.com', citations: 2, engines: ['perplexity'] }])).toEqual([]);
  });
  it('prints the exact fallback sentence when nothing qualifies on a losing category', () => {
    const md = buildSweepActionAgenda({
      brandedRetrievabilityPct: 100, categoryWinPct: 0, hasFidelityOrCollision: false, collisions: [],
      losingCategoryQuestions: ['best private 5G vendors'], doNowAuthorities: [], domain: 'nybsys.com', brand: 'Nybsys',
    }).join('\n');
    expect(md).toContain(NO_DO_NOW);
    expect(md).not.toMatch(/sourceforge|linkedin\.com|trustpilot/);
  });
});

describe('G2 — a domain the owner confirmed is theirs is never disclaimed', () => {
  const client = { domain: 'nybsys.com', brand: 'Nybsys' };
  const branded = [{ sources: ['https://www.nybsys-mwc.com/', 'https://www.nybsys.com/'], transcript: 'Nybsys builds private 5G.' }];
  it('flags the near-name domain by default (no auto-decision)', () => {
    expect(detectEntityLinkingFailures(branded, client, null).collisions).toContain('nybsys-mwc.com');
  });
  it('drops it once the owner marks it theirs', () => {
    expect(detectEntityLinkingFailures(branded, client, null, ['nybsys-mwc.com']).collisions).toEqual([]);
  });
  it('the remediation says what to DO with an owned property instead of disclaiming it', () => {
    const lines = remediationSnippet('nybsys.com', 'Nybsys', ['nybsys-mwc.com'], { declaredName: 'Nybsys', ownedDomains: ['nybsys-mwc.com'] }).join('\n');
    expect(lines).toContain('Owned property: nybsys-mwc.com.');
    expect(lines).toMatch(/301 it to your primary domain or add noindex/);
    expect(lines).not.toMatch(/not affiliated with similarly named entities such as nybsys-mwc\.com/);
  });
  it('links the owned domain INTO the @id graph as a WebSite of the same organization', () => {
    const r = generateSchema({ domain: 'nybsys.com', brand: 'Nybsys', declaredName: 'Nybsys', ownedDomains: ['nybsys-mwc.com'], collisions: ['nybsys-mwc.com'] });
    expect(r.jsonLd).toContain('"@id": "https://nybsys-mwc.com/#website"');
    expect(r.jsonLd).toContain('"publisher": {\n        "@id": "https://nybsys.com/#org"');
    expect(r.jsonLd).not.toContain('not affiliated');
  });
});
