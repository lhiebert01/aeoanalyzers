import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { scoreRun } from '../lib/citationSweep';
import { accuracyWhenNamed, classifyRunFidelity, misidentification } from '../lib/fidelity';
import { withIdentity } from '../lib/truthRecord';

/** Nov 22 2026: "Described accurately when named" showed 7 of 7 for usesignalatlas.com while most
 *  branded answers described other products called Signal Atlas. An answer that puts the brand on
 *  another domain, or defines it as something outside the site's own category, is a
 *  misidentification, not an accurate description. Fixture: the stored transcripts. */
const FX = JSON.parse(readFileSync('src/__tests__/fixtures/signalatlas-2026-11-22.json', 'utf8'));
const prep = (s: any) => {
  const client = { domain: s.domain, brand: s.brand };
  const runs = s.runs.map((r: any) => scoreRun(r, client, s.competitors || []));
  return { runs, truth: withIdentity(s.truth, s.domain, s.category) };
};

describe('misidentification: answers about a different product with the same name', () => {
  it('the Nov 22 sweep re-scores from 7 of 7 to 0 of 7 described accurately', () => {
    const { runs, truth } = prep(FX.sweeps[0]);
    const a = accuracyWhenNamed(runs, truth)!;
    expect(`${a.accurate} of ${a.named}`).toBe('0 of 7');
    expect(a.definition).toMatch(/not another with the same name/);
    // Without the site's own domain and category the old answer comes back: that was the bug.
    expect(accuracyWhenNamed(runs, { ...FX.sweeps[0].truth })!.accurate).toBeGreaterThan(0);
  });
  it('names the namesakes: another domain, or another category', () => {
    const { runs, truth } = prep(FX.sweeps[0]);
    const wrong = runs.filter((r: any) => r.cited).map((r: any) => classifyRunFidelity(true, r.transcript, truth, r.sources, r.query).issues.find((i) => i.type === 'misidentified')?.wrong || '');
    const all = wrong.join(' | ');
    for (const s of ['signalatlas.store', 'getsignalatlas.com', 'signalatlas.com', 'radio frequency spectrum', 'travel']) expect(all).toContain(s);
  });
  it('an answer that describes the research desk itself stays accurate', () => {
    const { runs, truth } = prep(FX.sweeps[1]);
    const right = runs.filter((r: any) => r.cited && /^Signal Atlas is a research platform/.test(r.transcript));
    expect(right.length).toBeGreaterThan(0);
    for (const r of right) expect(classifyRunFidelity(true, r.transcript, truth, r.sources, r.query).state).toBe('cited-accurate');
    // …and the namesakes in the same later sweep are still caught (news dashboard, Wi-Fi heatmap).
    const flagged = runs.filter((r: any) => r.cited && classifyRunFidelity(true, r.transcript, truth, r.sources, r.query).issues.some((i) => i.type === 'misidentified')).map((r: any) => r.transcript).join(' ');
    expect(flagged).toMatch(/news intelligence dashboard|Wi-Fi heatmap/);
  });
  it('words echoed from the question do not make an answer accurate', () => {
    const truth: any = { brandName: 'Signal Atlas', founders: [], sameAs: [], facts: [], domain: 'usesignalatlas.com', category: 'AI research assistant for official data with cited sources' };
    const said = 'Signal Atlas (usesignalatlas.com) is a quantitative stock trading desk for hedge funds and retail traders, built on momentum screens.';
    expect(misidentification(said, truth, [], 'Who makes the Signal Atlas research desk?')?.type).toBe('misidentified');
  });
  it('safeguards: own source, own founder, an ownership sentence, a person brand, no category line', () => {
    const base: any = { brandName: 'Signal Atlas', founders: ['Ada Lovelace'], sameAs: [], facts: [], domain: 'usesignalatlas.com', category: 'AI research assistant for official data with cited sources' };
    const travel = 'Signal Atlas is a travel platform comparing eSIM providers for global roaming plans.';
    expect(misidentification(travel, base)?.type).toBe('misidentified');
    expect(misidentification(travel, base, ['https://usesignalatlas.com/about'])).toBeNull();
    expect(misidentification(`${travel} It was founded by Ada Lovelace.`, base)).toBeNull();
    expect(misidentification('Signal Atlas is operated by Example Labs LLC.', base)).toBeNull();
    expect(misidentification(travel, { ...base, category: undefined })).toBeNull();
    expect(misidentification('Jane Roe is a travel writer covering eSIM roaming plans worldwide.', { ...base, brandName: 'Jane Roe', founders: ['Jane Roe'] })).toBeNull();
    // A namesake domain still counts without a category line, but never one the site declares (sameAs).
    expect(misidentification('See getsignalatlas.com for stock signals.', { ...base, category: undefined })?.wrong).toBe('getsignalatlas.com');
    expect(misidentification('See getsignalatlas.com for stock signals.', { ...base, sameAs: ['https://getsignalatlas.com'] })).toBeNull();
  });
  it('an acronym used as the category ("an AEO platform" for AEO Analyzers) is the site\'s own word', () => {
    const t: any = { brandName: 'AEO Analyzers', founders: [], sameAs: [], facts: [], domain: 'aeoanalyzers.com', category: 'Citation measurement for answer engines' };
    expect(misidentification('AEO Analyzers is an AEO platform for monitoring brands in AI search results and visibility.', t)).toBeNull();
  });
});
