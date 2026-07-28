import { describe, it, expect } from 'vitest';
import { redactFixFields, FIX_FIELDS } from '../lib/fixGating';

const SAMPLE = JSON.stringify({
  // free diagnostic (must survive)
  score: 82,
  summary: 'Your site is discoverable but weak on category questions.',
  criteria: [{ name: 'Entity', score: 8 }],
  recommendations: ['Add an FAQ page'],
  citationProbability: 61,
  scoreBreakdown: { entity: 8 },
  // paid fixes (must be stripped for free)
  schemaSnippet: '{"@context":"https://schema.org","@type":"Organization"}',
  verifiedSchema: '{"@graph":[]}',
  candidateSchema: '{"@graph":[]}',
  comprehensiveSchema: '{"@graph":[]}',
  contentRewrites: [{ current: 'a', proposed: 'b', page: '/' }],
  metaDescriptionRewrite: { current: 'x', suggested: 'y' },
  implementationChecklist: [{ category: 'schema', action: 'add JSON-LD', priority: 'high' }],
});

describe('redactFixFields (server-side paywall for fixes)', () => {
  it('strips EVERY paid fix field from a free response', () => {
    const out = JSON.parse(redactFixFields(SAMPLE));
    for (const f of FIX_FIELDS) {
      expect(out[f], `fix field "${f}" must not leak to a free user`).toBeUndefined();
    }
  });

  it('preserves the free diagnostic (score + gaps + recommendations)', () => {
    const out = JSON.parse(redactFixFields(SAMPLE));
    expect(out.score).toBe(82);
    expect(out.summary).toContain('discoverable');
    expect(out.recommendations).toEqual(['Add an FAQ page']);
    expect(out.citationProbability).toBe(61);
    expect(out.gated).toBe(true);
  });

  it('leaves a response with no fix fields unchanged (no spurious gating marker)', () => {
    const scoreOnly = JSON.stringify({ score: 90, summary: 'ok' });
    expect(redactFixFields(scoreOnly)).toBe(scoreOnly);
  });

  it('is a safe no-op on non-JSON / non-object text', () => {
    expect(redactFixFields('not json at all')).toBe('not json at all');
    expect(redactFixFields('[1,2,3]')).toBe('[1,2,3]');
  });
});
