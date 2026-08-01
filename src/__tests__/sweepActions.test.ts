// WO-UX-CLARITY-001 — the "What to do about these results" action agenda.

import { describe, it, expect } from 'vitest';
import { buildSweepActionAgenda, remediationSnippet, WEAK_RETRIEVABILITY } from '../lib/sweepActions';

const base = {
  brandedRetrievabilityPct: 100,
  categoryWinPct: 100,
  hasFidelityOrCollision: false,
  collisions: [] as string[],
  losingCategoryQuestions: [] as string[],
  doNowAuthorities: [] as string[],
  domain: 'aeoanalyzers.com',
  brand: 'AEO Analyzers',
};

describe('buildSweepActionAgenda', () => {
  it('always ends with the monthly re-sweep instruction', () => {
    const md = buildSweepActionAgenda(base).join('\n');
    expect(md).toMatch(/Re-sweep after changes — same questions, same way/);
  });

  it('a healthy result yields ONLY the re-sweep line — no false action sections', () => {
    const md = buildSweepActionAgenda(base).join('\n');
    expect(md).not.toMatch(/Run the AEO Score/);
    expect(md).not.toMatch(/paste this into your site/);
    expect(md).not.toMatch(/content agenda/);
  });

  it('weak retrievability routes to the AEO Score fix path', () => {
    const md = buildSweepActionAgenda({ ...base, brandedRetrievabilityPct: WEAK_RETRIEVABILITY - 1 }).join('\n');
    expect(md).toMatch(/Run the AEO Score/);
  });

  it('fidelity/collision renders the paste-ready remediation with the colliding names', () => {
    const md = buildSweepActionAgenda({
      ...base, hasFidelityOrCollision: true, collisions: ['aeoanalytics.com', 'Wikipedia: aea'],
    }).join('\n');
    expect(md).toMatch(/confusing you with other entities \(aeoanalytics\.com, Wikipedia: aea\)/);
    expect(md).toMatch(/application\/ld\+json/);          // the @id graph snippet
    expect(md).toMatch(/is not affiliated with/);          // the unaffiliation line
  });

  it('category shortfall lists the exact losing questions as a content agenda + Do-now checklist', () => {
    const md = buildSweepActionAgenda({
      ...base, categoryWinPct: 0,
      losingCategoryQuestions: ['best AEO tools', 'top answer engine optimization software'],
      doNowAuthorities: ['reddit.com', 'g2.com'],
    }).join('\n');
    expect(md).toMatch(/Write the page that answers: "best AEO tools"/);
    expect(md).toMatch(/Write the page that answers: "top answer engine optimization software"/);
    expect(md).toMatch(/Do-now tier\):.*reddit\.com, g2\.com/);
  });
});

describe('remediationSnippet (grounded — no fabricated values)', () => {
  it('re-expresses only the detected brand, domain, and colliding names', () => {
    const lines = remediationSnippet('aeoanalyzers.com', 'AEO Analyzers', ['aeoanalytics.com']).join('\n');
    expect(lines).toMatch(/"name": "AEO Analyzers"/);
    expect(lines).toMatch(/https:\/\/aeoanalyzers\.com\/#org/);
    expect(lines).toMatch(/not affiliated with similarly named entities such as aeoanalytics\.com/);
    // No invented numbers / ratings leaked into the snippet.
    expect(lines).not.toMatch(/aggregateRating|ratingValue|reviewCount/);
  });
});
