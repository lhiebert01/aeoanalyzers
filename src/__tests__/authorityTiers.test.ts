// WO-QA-003 C2 — attainability-tier registry. Self-serve vs pitchable vs
// aspirational, so a solo founder isn't told to "get on Wikipedia" first.

import { describe, it, expect } from 'vitest';
import { tierForDomain, TIER_LABEL } from '../lib/authorityTiers';

describe('tierForDomain', () => {
  it('marks self-serve listing/profile surfaces "now"', () => {
    expect(tierForDomain('g2.com').tier).toBe('now');
    expect(tierForDomain('linkedin.com').tier).toBe('now');
    expect(tierForDomain('https://www.reddit.com/r/seo').tier).toBe('now'); // normalizes host
    expect(tierForDomain('youtube.com').tier).toBe('now');
  });

  it('marks editorial/analyst gatekeepers "aspirational"', () => {
    expect(tierForDomain('en.wikipedia.org').tier).toBe('aspirational'); // registrable → wikipedia.org
    expect(tierForDomain('gartner.com').tier).toBe('aspirational');
    expect(tierForDomain('forbes.com').tier).toBe('aspirational');
  });

  it('marks category blogs/publishers "earned", including by subdomain', () => {
    expect(tierForDomain('blog.hubspot.com').tier).toBe('earned'); // registrable → hubspot.com
    expect(tierForDomain('nicklafferty.com').tier).toBe('earned');
  });

  it('defaults an unknown cited source to "earned" (a pitchable blog)', () => {
    expect(tierForDomain('some-random-aeo-blog.io').tier).toBe('earned');
  });

  it('every tier has a human label', () => {
    expect(TIER_LABEL.now).toMatch(/now/i);
    expect(TIER_LABEL.aspirational).toMatch(/aspirational/i);
  });
});
