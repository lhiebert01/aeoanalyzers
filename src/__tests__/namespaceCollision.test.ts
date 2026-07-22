import { describe, it, expect } from 'vitest';
import { namespaceCollisionRisk } from '../lib/namespaceCollision';
import { classifyFalseFact } from '../lib/factClassification';

describe('namespaceCollisionRisk (WO-8 / dogfood)', () => {
  it('flags a fully descriptive name as HIGH risk (our own incident)', () => {
    const r = namespaceCollisionRisk('AEO Analyzer');
    expect(r.risk).toBe('high');
    expect(r.descriptiveTokens).toEqual(expect.arrayContaining(['aeo', 'analyzer']));
    expect(r.recommendations.join(' ')).toMatch(/disambiguat|alternateName|by </i);
  });

  it('strips a "by Company" suffix, still flags high, notes the plural', () => {
    const r = namespaceCollisionRisk('AEO Analyzers by PI GenAI LLC');
    expect(r.brandName).toBe('AEO Analyzers');
    expect(r.risk).toBe('high');
    expect(r.isPlural).toBe(true);
    expect(r.recommendations.join(' ')).toMatch(/plural/i);
  });

  it('treats a distinctive name as LOW risk', () => {
    expect(namespaceCollisionRisk('Stripe').risk).toBe('low');
    expect(namespaceCollisionRisk('Macro Lens').risk).toBe('low');
  });

  it('flags an all-generic multiword name as high', () => {
    expect(namespaceCollisionRisk('SEO Tool').risk).toBe('high');
  });
});

describe('classifyFalseFact (WO-2 classification layer)', () => {
  it('no cited sources → fabrication', () => {
    const c = classifyFalseFact({ wrong: 'Jesper Nissen', sources: [] });
    expect(c.class).toBe('fabrication');
    expect(c.fixPath).toMatch(/authority/i);
  });

  it('was-ever-true → staleness', () => {
    const c = classifyFalseFact({ wrong: '$29/mo', sources: ['https://x.com'], wasEverTrue: true });
    expect(c.class).toBe('staleness');
  });

  it('a cited source belongs to the named entity → conflation', () => {
    const c = classifyFalseFact({ wrong: 'Jesper Nissen', sources: ['https://schemawriter.ai/about'], namedEntityDomain: 'schemawriter.ai' });
    expect(c.class).toBe('conflation');
    expect(c.confidence).toBe('high');
  });

  it('sources exist but none trace to the entity → reranker_conflation needing a source check', () => {
    const c = classifyFalseFact({ wrong: 'Jesper Nissen', sources: ['https://who.is/x', 'https://godaddy.com/y'] });
    expect(c.class).toBe('reranker_conflation');
    expect(c.needsSourceContentCheck).toBe(true);
    expect(c.fixPath).toMatch(/propagation|recrawl/i);
  });
});
