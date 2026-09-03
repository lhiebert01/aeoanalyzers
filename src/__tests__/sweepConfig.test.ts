// WO-SWEEP-POLISH-002 A1/A2c — deterministic config-surface guardrails.

import { describe, it, expect } from 'vitest';
import { lintDefunctNames, hasDefunctName, sanitizeCompetitors, isSectionLabel, stripNonQuestionLines } from '../lib/sweepConfig';

describe('question-box guard (WO-INTEGRITY-002 C1) — labels are not questions', () => {
  it('isSectionLabel flags section headings, not real questions', () => {
    for (const l of ['Problem-first', 'Head-to-head', 'Category discovery', 'About you', 'From prospective customers', 'More buyer questions', '']) {
      expect(isSectionLabel(l)).toBe(true);
    }
    for (const q of ['best free ecard sites without a subscription', 'how to send a card by text', 'Jacquie Lawson alternatives that are free']) {
      expect(isSectionLabel(q)).toBe(false);
    }
  });

  it('the Sep-2 paste that showed "14 questions" strips to 12', () => {
    // Exactly the founder's pasted list, with the two label lines that leaked in.
    const pasted = [
      'best free ecard sites without a subscription',
      'free digital greeting cards you can send by text message',
      'best app to send a birthday card with a song in it',
      'Problem-first',
      'how to send an online greeting card without a subscription or account',
      'how to send someone a song as a musical greeting',
      "how to send a digital card without giving the recipient's email address",
      'Head-to-head',
      'free alternatives to Paperless Post for sending a single card',
      'Jacquie Lawson alternatives that are free',
      'Hallmark eCards alternative with no membership fee',
      "digital greeting card that doesn't track the recipient",
    ];
    const kept = stripNonQuestionLines(pasted);
    expect(kept.length).toBe(10);                       // 12 pasted − 2 labels
    expect(kept).not.toContain('Problem-first');
    expect(kept).not.toContain('Head-to-head');
  });
});

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
