// WO-UX-CLARITY-001 — the "Which tool, when?" explainer copy stays voice-clean.

import { describe, it, expect } from 'vitest';
import { bannedAbsolutes } from '../lib/voiceLint';
import { SCORE_VS_SWEEP, scoreVsSweepStrings } from '../content/scoreVsSweep';

describe('Score-vs-Sweep explainer copy', () => {
  it('every user-facing string passes the measurement-honesty voice guard', () => {
    for (const s of scoreVsSweepStrings()) {
      expect(bannedAbsolutes(s), `banned phrase in: ${s}`).toEqual([]);
    }
  });

  it('keeps the ratified cross-link strings verbatim', () => {
    expect(SCORE_VS_SWEEP.toSweep).toBe('Prove your fixes worked — run a Citation Sweep →');
    expect(SCORE_VS_SWEEP.toScore).toBe('Structural fixes live in your AEO Score →');
  });

  it('holds the inside-out / outside-in framing', () => {
    expect(SCORE_VS_SWEEP.score.body).toMatch(/inside-out/);
    expect(SCORE_VS_SWEEP.sweep.body).toMatch(/outside-in/);
  });
});
