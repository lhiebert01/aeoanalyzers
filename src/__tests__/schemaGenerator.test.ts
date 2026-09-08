import { describe, it, expect } from 'vitest';
import { generateSchema, reconcileProperty } from '../lib/schemaGenerator';

/** WO-AEO-REPORT-INTEGRITY-003 Rev B §2.1 and §2.5.
 *
 *  One generator, called by both renderers, so two reports for one domain on one day
 *  cannot contradict each other. The fixture throughout is the real September 8 case. */

const OWNED = ['aeoanalyzers.com', 'thesmartaiworker.com', 'lanternpost.app'];

describe('§2.1 — one generator, so the two reports cannot disagree', () => {
  it('returns byte-identical markup for identical facts, however it is called', () => {
    const facts = { domain: 'lanternpost.app', brand: 'Lantern Post', declaredName: 'Lantern Post', ownedDomains: OWNED };
    expect(generateSchema(facts).jsonLd).toBe(generateSchema({ ...facts }).jsonLd);
  });

  it('refuses on the real Sep 8 inputs instead of emitting a false binding', () => {
    const r = generateSchema({
      domain: 'thesmartaiworker.com',
      brand: 'AEO Analyzers',
      collisions: ['aeoanalyzers.com'],
      ownedDomains: OWNED,
    });
    expect(r.jsonLd).toBeNull();
    expect(r.refusedBecause).toContain('AEO Analyzers');
    expect(r.refusedBecause).toContain('thesmartaiworker.com');
  });

  it('prefers what the site declares over what the user typed', () => {
    // This is the specific reversal that manufactured the Sep 8 collision.
    const r = generateSchema({
      domain: 'thesmartaiworker.com',
      brand: 'AEO Analyzers',
      declaredName: 'The Smart AI Worker',
      ownedDomains: OWNED,
    });
    expect(r.jsonLd).toContain('The Smart AI Worker');
    expect(r.jsonLd).not.toContain('AEO Analyzers');
  });

  it('never disclaims a domain the customer owns', () => {
    const r = generateSchema({
      domain: 'aeoanalyzers.com',
      declaredName: 'AEO Analyzers',
      collisions: ['aeoanalyzers.com', 'lantern.io'],
      ownedDomains: OWNED,
    });
    expect(r.jsonLd).toContain('lantern.io');
    expect(r.jsonLd).not.toMatch(/not affiliated[^"]*aeoanalyzers\.com/);
  });

  it('refuses when the site names itself nowhere at all', () => {
    const r = generateSchema({ domain: 'unknown-site.com', ownedDomains: OWNED });
    expect(r.jsonLd).toBeNull();
    expect(r.refusedBecause).toContain('could not establish');
  });
});

describe('§2.5 — never two values for one property, and report the inconsistency', () => {
  it('picks the most frequent form and reports that the page is inconsistent', () => {
    const r = reconcileProperty('organization name', [
      { value: 'PIGENAI LLC', count: 3 },
      { value: 'PI GenAI LLC', count: 1 },
    ]);
    expect(r.chosen).toBe('PIGENAI LLC');
    expect(r.finding).toContain('PIGENAI LLC (3×)');
    expect(r.finding).toContain('PI GenAI LLC (1×)');
    expect(r.finding).toContain('different entities');
  });

  it('emits NOTHING for the property on a tie rather than inventing a canon', () => {
    const r = reconcileProperty('job title', [
      { value: 'Founder & Creator', count: 1 },
      { value: 'CMO & AI Officer', count: 1 },
    ]);
    expect(r.chosen).toBeNull();
    expect(r.finding).toContain('equally often');
    expect(r.finding).toContain('left it out of the generated markup');
  });

  it('says nothing when the page is already consistent', () => {
    expect(reconcileProperty('organization name', [{ value: 'Lantern Post', count: 4 }]).finding).toBeNull();
    expect(reconcileProperty('organization name', []).finding).toBeNull();
  });

  it('surfaces the inconsistency as a finding on the generated result', () => {
    const r = generateSchema({
      domain: 'pigenai.com',
      declaredName: 'PIGENAI LLC',
      observedNames: [{ value: 'PIGENAI LLC', count: 3 }, { value: 'PI GenAI LLC', count: 1 }],
      ownedDomains: OWNED,
    });
    expect(r.findings.some((f) => f.includes('two ways') || f.includes('2 ways'))).toBe(true);
    // and the emitted markup carries exactly one name
    expect((r.jsonLd!.match(/"name":/g) || []).length).toBe(1);
  });
});
