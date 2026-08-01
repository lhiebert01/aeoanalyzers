// WO-UX-CLARITY-001 — analyzer all-zeros sanity guard.

import { describe, it, expect } from 'vitest';
import { isAllZeroAnalysis, ALL_ZERO_BANNER } from '../lib/inputSafety';

describe('isAllZeroAnalysis', () => {
  it('is TRUE when every subscore is 0 (the analyzers.com wrong-domain miss)', () => {
    expect(isAllZeroAnalysis({ score: 0, scoreBreakdown: { entity: 0, density: 0, clarity: 0, structure: 0 } })).toBe(true);
  });

  it('is FALSE when any subscore is non-zero (a real low score is still a real verdict)', () => {
    expect(isAllZeroAnalysis({ score: 12, scoreBreakdown: { entity: 0, density: 4, clarity: 0, structure: 0 } })).toBe(false);
    expect(isAllZeroAnalysis({ score: 88, scoreBreakdown: { entity: 95, density: 80, clarity: 90, structure: 85 } })).toBe(false);
  });

  it('falls back to the overall score when there is no breakdown', () => {
    expect(isAllZeroAnalysis({ score: 0 })).toBe(true);
    expect(isAllZeroAnalysis({ score: 40 })).toBe(false);
  });

  it('is FALSE for null/undefined (nothing to warn about)', () => {
    expect(isAllZeroAnalysis(null)).toBe(false);
    expect(isAllZeroAnalysis(undefined)).toBe(false);
  });

  it('ships the founder-ratified banner copy', () => {
    expect(ALL_ZERO_BANNER).toMatch(/Every subscore is 0/);
    expect(ALL_ZERO_BANNER).toMatch(/Verify the URL/);
  });
});
