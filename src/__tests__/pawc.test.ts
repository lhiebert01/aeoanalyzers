// WO-QA-003 E1 — Position-Adjusted Word Count (PAWC).

import { describe, it, expect } from 'vitest';
import { pawcShare, avgPawc } from '../lib/pawc';

const mentions = (needle: string) => (s: string) => s.toLowerCase().includes(needle.toLowerCase());

describe('pawcShare', () => {
  it('is 0 when the subject is never mentioned', () => {
    expect(pawcShare('Profound and Scrunch are the leaders.', mentions('acme'))).toBe(0);
  });

  it('is higher when the subject owns the opening sentence than a trailing aside', () => {
    const early = 'Acme is the best pick for this. Some other tools also exist in the space here.';
    const late = 'Some other tools also exist in the space here. Acme is a smaller option too.';
    const eEarly = pawcShare(early, mentions('acme'));
    const eLate = pawcShare(late, mentions('acme'));
    expect(eEarly).toBeGreaterThan(eLate); // position decay rewards the opening sentence
    expect(eEarly).toBeGreaterThan(0);
    expect(eEarly).toBeLessThanOrEqual(1);
  });

  it('gives a larger share when the subject owns more of the answer', () => {
    const dominant = 'Acme is the clear leader with the deepest feature set and best support. Acme wins.';
    const minor = 'PayNorth, LedgerLine, and BigCorp lead the market broadly. Acme is one small alternative.';
    expect(pawcShare(dominant, mentions('acme'))).toBeGreaterThan(pawcShare(minor, mentions('acme')));
  });
});

describe('avgPawc', () => {
  it('averages only over answers where the subject appears', () => {
    const { avgShare, answers } = avgPawc(
      ['Acme is great.', 'No mention here of the tool.', 'Acme leads, and others follow.'],
      mentions('acme')
    );
    expect(answers).toBe(2);            // the middle answer is skipped
    expect(avgShare).toBeGreaterThan(0);
    expect(avgShare).toBeLessThanOrEqual(1);
  });

  it('returns 0 share / 0 answers when never mentioned', () => {
    expect(avgPawc(['nothing', 'here either'], mentions('acme'))).toEqual({ avgShare: 0, answers: 0 });
  });
});
