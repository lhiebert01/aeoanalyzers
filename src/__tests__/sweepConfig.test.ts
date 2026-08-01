// WO-SWEEP-POLISH-002 A1/A2c — deterministic config-surface guardrails.

import { describe, it, expect } from 'vitest';
import { lintDefunctNames, hasDefunctName, sanitizeCompetitors } from '../lib/sweepConfig';

describe('lintDefunctNames (A2c — defunct product names)', () => {
  it('rewrites discontinued names to their current ones', () => {
    expect(lintDefunctNames('track my brand in SearchGPT and Bard')).toBe('track my brand in ChatGPT search and Gemini');
    expect(lintDefunctNames('Bing Chat vs Google SGE')).toBe('Copilot vs Google AI Overviews');
    expect(lintDefunctNames('Search Generative Experience results')).toBe('Google AI Overviews results');
  });

  it('generator output never retains a registry name after linting', () => {
    const generated = ['best tools for SearchGPT visibility', 'Bard vs Gemini for citations', 'monitor Bing Chat mentions'];
    for (const q of generated) {
      expect(hasDefunctName(q)).toBe(true);          // the raw model output still has them
      expect(hasDefunctName(lintDefunctNames(q))).toBe(false); // …but the linted output does not
    }
  });

  it('leaves current names untouched', () => {
    expect(lintDefunctNames('how do I show up in ChatGPT answers')).toBe('how do I show up in ChatGPT answers');
  });
});

describe('sanitizeCompetitors (A1 — competitor seed hygiene)', () => {
  const opts = { brand: 'AEO Analyzers', ownDomain: 'aeoanalyzers.com' };

  it('drops the client itself (by brand and by own domain root), empties, and dupes', () => {
    const out = sanitizeCompetitors(
      ['Profound, tryprofound.com', 'profound', '  ', 'AEO Analyzers', 'aeoanalyzers', 'Otterly AI'],
      opts
    );
    expect(out).toEqual(['Profound, tryprofound.com', 'Otterly AI']);
  });

  it('rewrites a defunct name that leaks into the competitor seed', () => {
    const out = sanitizeCompetitors(['Bard', 'Profound'], opts);
    expect(out).toEqual(['Gemini', 'Profound']);
  });

  it('is a no-op-safe passthrough for a clean, distinct list', () => {
    const out = sanitizeCompetitors(['Profound', 'Otterly AI', 'Scrunch AI'], opts);
    expect(out).toEqual(['Profound', 'Otterly AI', 'Scrunch AI']);
  });
});
