// WO-QA-003 E2 — fact-density / information-gain page auditor.

import { describe, it, expect } from 'vitest';
import { auditFactDensity, compareFactDensity } from '../lib/factDensity';

describe('auditFactDensity', () => {
  it('flags a fluffy page with no stats, quotes, or citations', () => {
    const a = auditFactDensity('<p>We are a leading solution that helps businesses grow and succeed with our amazing platform built for teams who care about results and outcomes and value.</p>');
    expect(a.flags.map((f) => f.key)).toContain('statistics');
    expect(a.flags.map((f) => f.key)).toContain('quotations');
    expect(a.flags.map((f) => f.key)).toContain('inline-citations');
    expect(a.flags.find((f) => f.key === 'statistics')!.consequence).toMatch(/arXiv:2311\.09735/);
    expect(a.flags.find((f) => f.key === 'statistics')!.consequence).toMatch(/associated with/); // study framing, not a promise
  });

  it('passes a fact-dense page (numbers, a quotation, outbound citations)', () => {
    const html = `<p>The tool runs 60 queries across 4 engines in 90 seconds. Adoption grew 41% in 2026.
      "It changed how we measure visibility," said the CMO. See the data at
      <a href="https://example.com/study">the study</a> and <a href="https://g2.com/x">G2</a>.</p>`;
    const a = auditFactDensity(html);
    expect(a.statCount).toBeGreaterThan(0);
    expect(a.quotationCount).toBeGreaterThan(0);
    expect(a.inlineCitationCount).toBeGreaterThanOrEqual(2);
    expect(a.flags.map((f) => f.key)).not.toContain('statistics');
  });

  it('detects a keyword-stuffing signal', () => {
    const stuffed = 'AEO ' + 'aeotool '.repeat(45) + 'aeotool platform for aeo teams doing aeo work with aeo.';
    expect(auditFactDensity(stuffed).keywordStuffing).toBe(true);
  });

  it('names the fact-density gap when a competitor out-cites the client', () => {
    const client = auditFactDensity('<p>We help teams do better with our platform.</p>');
    const rival = auditFactDensity('<p>Our tool cut costs 32% in 2026 across 1,200 customers. "Best decision," said the CFO. <a href="https://x.com/a">source</a></p>');
    const gap = compareFactDensity(client, rival, 'Profound');
    expect(gap).toMatch(/Profound out-cites you/);
    expect(gap).toMatch(/arXiv:2311\.09735/);
  });
});
