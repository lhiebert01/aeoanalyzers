// WO-QA-003 B2 — entity-linking failure detection. Fixtures are drawn from the
// ACTUAL aeoanalyzers.com dogfood sweep (2026-07-31): Claude cited Wikipedia
// acronym pages + a ticker page; Perplexity blended a near-name domain; the
// correct answer (own site only) must stay clean.

import { describe, it, expect } from 'vitest';
import { detectEntityLinkingFailures } from '../lib/entityLinking';

const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
const truth = { sameAs: ['https://www.linkedin.com/in/lindsayhiebert/'] };

describe('detectEntityLinkingFailures', () => {
  it('flags Wikipedia acronym/disambiguation pages for the colliding symbol', () => {
    const rep = detectEntityLinkingFailures([
      { sources: ['https://en.wikipedia.org/wiki/AEA', 'https://en.wikipedia.org/wiki/AEi_Systems'] },
    ], client, truth);
    expect(rep.flags.some((f) => f.kind === 'wikipedia-collision')).toBe(true);
    expect(rep.collisions.join(' ')).toMatch(/AEA/i);
  });

  it('flags a finance/stock-ticker page (colliding ticker AEO)', () => {
    const rep = detectEntityLinkingFailures([
      { sources: ['https://finance.yahoo.com/quote/AEO/analysis/', 'https://es.benzinga.com/quote/AEO/price-targets'] },
    ], client, truth);
    expect(rep.flags.some((f) => f.kind === 'ticker-collision')).toBe(true);
  });

  it('flags a near-name domain that is not the client', () => {
    const rep = detectEntityLinkingFailures([
      { sources: ['https://aeoanalytics.com/', 'https://aeoaudittool.com/'] },
    ], client, truth);
    const nearNames = rep.flags.filter((f) => f.kind === 'near-name-domain').map((f) => f.collidingEntity);
    expect(nearNames).toContain('aeoanalytics.com');
    expect(nearNames).toContain('aeoaudittool.com');
  });

  it('does NOT flag the real site, declared profiles, or a real finance ARTICLE (no ticker path)', () => {
    const rep = detectEntityLinkingFailures([
      { sources: [
        'https://aeoanalyzers.com/',                                   // the real site
        'https://www.linkedin.com/in/lindsayhiebert/',                 // declared sameAs
        'https://www.barchart.com/story/news/833118/answer-engine',    // finance host, but an ARTICLE, not /quote/
      ] },
    ], client, truth);
    expect(rep.flags).toHaveLength(0);
  });

  it('positive control: a correct answer sourced only from the real site is clean', () => {
    const rep = detectEntityLinkingFailures([
      { sources: ['https://aeoanalyzers.com/'] },
    ], client, truth);
    expect(rep.flags).toHaveLength(0);
    expect(rep.collisions).toHaveLength(0);
  });
});
