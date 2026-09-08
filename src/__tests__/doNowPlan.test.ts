import { describe, it, expect } from 'vitest';
import { buildDoNowPlan, classifyProblem, STRUCTURED_DATA_RULE } from '../lib/doNowPlan';

/** WO-AEO-REPORT-INTEGRITY-003 Rev B Part B. The measurement was already good; the
 *  failure was in the layer where the product stops reporting and starts advising. */

const paid = { domain: 'example.com', paid: true };

describe('§3.1 — name the problem before prescribing', () => {
  it('calls it a discovery problem when no engine retrieved them', () => {
    const p = buildDoNowPlan({ ...paid, perEngine: [
      { engine: 'claude', found: 0, total: 6 }, { engine: 'openai', found: 0, total: 6 },
    ]});
    expect(p.problem).toBe('not-found');
    expect(p.situation.join(' ')).toContain('discovery problem');
    expect(p.situation.join(' ')).toContain('cannot invite a crawler that never arrives');
    // and it must NOT hand a discovery customer a schema checklist
    expect(p.steps.map((s) => s.what).join(' ')).not.toMatch(/Validate the markup/);
  });

  it('calls it an accuracy problem when every engine retrieved them', () => {
    const p = buildDoNowPlan({ ...paid, perEngine: [
      { engine: 'claude', found: 6, total: 6 }, { engine: 'openai', found: 5, total: 6 },
    ]});
    expect(p.problem).toBe('found-but-misdescribed');
    expect(p.situation.join(' ')).toContain('accuracy problem');
    expect(p.steps.map((s) => s.what).join(' ')).toContain('Validate the markup');
    // no index-submission steps for a customer who is already found
    expect(p.steps.map((s) => s.what).join(' ')).not.toMatch(/Bing Webmaster/);
  });

  it('splits it by engine when the answer differs, and says what will not move', () => {
    const p = buildDoNowPlan({ ...paid, perEngine: [
      { engine: 'openai', found: 6, total: 6 }, { engine: 'claude', found: 0, total: 6 },
    ]});
    expect(p.problem).toBe('mixed');
    expect(p.foundBy).toEqual(['openai']);
    expect(p.notFoundBy).toEqual(['claude']);
    expect(p.situation.join(' ')).toContain('will do nothing at all for claude');
  });

  it('states the honest rule verbatim', () => {
    const p = buildDoNowPlan({ ...paid, perEngine: [{ engine: 'claude', found: 0, total: 6 }] });
    expect(p.situation.join(' ')).toContain(STRUCTURED_DATA_RULE);
  });

  it('refuses to classify when nothing was measured', () => {
    expect(classifyProblem([])).toBe('unmeasured');
    expect(classifyProblem([{ engine: 'x', found: 0, total: 0 }])).toBe('unmeasured');
  });
});

describe('§3.2 — every step carries all five fields, and the tier rule holds', () => {
  const p = buildDoNowPlan({
    ...paid,
    perEngine: [{ engine: 'openai', found: 6, total: 6 }, { engine: 'claude', found: 0, total: 6 }],
    collisions: ['lantern.io', 'lanterns.app'],
    authorityGap: [{ domain: 'g2.com', citations: 7 }, { domain: 'reddit.com', citations: 9 }],
  });

  it('fills what, why, link, time, changes and does-not-change on every step', () => {
    expect(p.steps.length).toBeGreaterThan(3);
    for (const s of p.steps) {
      expect(s.what).toBeTruthy();
      expect(s.why).toBeTruthy();
      expect(s.link).toBeTruthy();
      expect(s.time).toBeTruthy();
      expect(s.changes).toBeTruthy();
      expect(s.doesNotChange).toBeTruthy(); // never optional
    }
  });

  it('recommends a directory ONLY from the customer\'s own authority data, and cites the count', () => {
    const g2 = p.steps.find((s) => /G2/.test(s.what));
    expect(g2!.why).toContain('cited 7 times');
    const noG2 = buildDoNowPlan({ ...paid, perEngine: [{ engine: 'openai', found: 6, total: 6 }] });
    expect(noG2.steps.find((s) => /G2/.test(s.what))).toBeUndefined();
  });

  it('surfaces Wikidata only on a collision, with the person-item caveat attached', () => {
    const w = p.steps.find((s) => /Wikidata/.test(s.what));
    expect(w!.why).toContain('lantern.io');
    expect(w!.doesNotChange).toContain('flagged for deletion');
    const noCollision = buildDoNowPlan({ ...paid, perEngine: [{ engine: 'openai', found: 6, total: 6 }] });
    expect(noCollision.steps.find((s) => /Wikidata/.test(s.what))).toBeUndefined();
  });

  it('ships the Reddit guardrail attached to the step, not as a footnote', () => {
    const r = p.steps.find((s) => /Reddit/.test(s.what));
    expect(r!.doesNotChange).toContain('No astroturfing');
    expect(r!.doesNotChange).toContain('several subreddits');
  });

  it('says plainly where no submission channel exists', () => {
    expect(p.noChannelNote).toContain('no submission mechanism');
    expect(p.noChannelNote).toContain('Brave');
  });

  it('withholds the recipe from free tier but never the diagnosis', () => {
    const free = buildDoNowPlan({ domain: 'example.com', paid: false, perEngine: [{ engine: 'claude', found: 0, total: 6 }] });
    expect(free.steps).toEqual([]);
    expect(free.gatedNote).toContain('Day Pass');
    expect(free.situation.join(' ')).toContain('discovery problem'); // diagnosis is theirs either way
  });
});
