import { describe, it, expect } from 'vitest';
import { evaluateCrawlerAccess } from '../lib/crawlerAccess';


/** S1 from the Sep 17 playbook review, and the defect was ours rather than the
 *  document's. Google-Extended is a training/grounding OPT-OUT CONTROL, not a fetcher.
 *  Marked critical, it capped a score at 35 and told the customer "these engines cannot
 *  read your page" — a sentence about a crawler, applied to a directive that never
 *  requests one, punishing a deliberate AI-training opt-out as a discoverability defect. */
describe('an opt-out directive is not a crawler and never caps a score', () => {
  const ROBOTS_OPTED_OUT = [
    'User-agent: *', 'Allow: /',
    'User-agent: Google-Extended', 'Disallow: /',
  ].join('\n');

  it('blocking Google-Extended alone does not trigger a critical block', () => {
    const a = evaluateCrawlerAccess({ robotsTxt: ROBOTS_OPTED_OUT, llmsTxtFound: true });
    expect(a.criticalBlock).toBe(false);
  });

  it('and does not cap the score into the failing band', () => {
    const a = evaluateCrawlerAccess({ robotsTxt: ROBOTS_OPTED_OUT, llmsTxtFound: true });
    expect(a.score).toBeGreaterThan(35);
  });

  it('never claims an opt-out directive cannot read the page', () => {
    const a = evaluateCrawlerAccess({ robotsTxt: ROBOTS_OPTED_OUT, llmsTxtFound: true });
    const text = [a.summary, ...a.recommendations].join(' ');
    expect(text).not.toMatch(/Google-Extended.*cannot read your page/s);
  });

  it('is still audited and still reported, so the customer knows what they opted out of', () => {
    const a = evaluateCrawlerAccess({ robotsTxt: ROBOTS_OPTED_OUT, llmsTxtFound: true });
    expect(a.blockedBots.map((b) => b.name)).toContain('Google-Extended');
  });

  it('a REAL crawler being blocked still caps the score — the guard is not weakened', () => {
    const a = evaluateCrawlerAccess({ robotsTxt: ['User-agent: GPTBot', 'Disallow: /'].join('\n'), llmsTxtFound: true });
    expect(a.criticalBlock).toBe(true);
    expect(a.score).toBeLessThanOrEqual(35);
  });
});
