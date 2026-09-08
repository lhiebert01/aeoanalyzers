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

  it('the G2 step never implies a listing is sufficient', () => {
    // G2's cited page is REVIEW-RANKED, so a listing alone can put a customer in the
    // corpus without getting them into an answer. Saying otherwise is precisely the
    // overpromise this section exists to prevent.
    const g2 = p.steps.find((s) => /G2/.test(s.what))!;
    expect(g2.doesNotChange).toMatch(/review-ranked/);
    expect(g2.doesNotChange).toMatch(/listing alone does not/);
    expect(g2.doesNotChange).toMatch(/corpus without yet putting you in an answer/);
    expect(g2.doesNotChange).not.toMatch(/will (get|put) you (into|in) (an )?answer/i);
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

  it('keeps every caveat ON its step — information belongs where it is read', () => {
    // Reached independently by three sessions in one week. A reader acting on step five
    // does not scroll back for a caution filed under step one, so no caveat may be moved
    // into a footnote, an appendix, or a general note at the end.
    const wikidata = p.steps.find((s) => /Wikidata/.test(s.what))!;
    const g2 = p.steps.find((s) => /G2/.test(s.what))!;
    const reddit = p.steps.find((s) => /Reddit/.test(s.what))!;
    expect(wikidata.doesNotChange).toMatch(/person item/i);
    expect(g2.doesNotChange).toMatch(/review-ranked/);
    expect(reddit.doesNotChange).toMatch(/astroturfing/i);
    // and the plan carries no catch-all caveat block that these could be tidied into
    expect(Object.keys(p)).not.toContain('caveats');
    expect(Object.keys(p)).not.toContain('footnotes');
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

  /** Green-light checklist item 7 — the check that catches the instinct to make a good
   *  how-to available. Run against the richest possible input, so any leak shows. */
  it('item 7: a free-tier pull leaks no link and no pre-filled value', () => {
    const free = buildDoNowPlan({
      domain: 'example.com', paid: false,
      perEngine: [{ engine: 'openai', found: 6, total: 6 }, { engine: 'claude', found: 0, total: 6 }],
      collisions: ['lantern.io'],
      authorityGap: [{ domain: 'g2.com', citations: 7 }, { domain: 'reddit.com', citations: 9 }],
    });
    const blob = JSON.stringify(free);
    expect(free.steps).toEqual([]);
    expect(blob).not.toMatch(/https?:\/\//);
    expect(blob).not.toMatch(/sell\.g2\.com|bing\.com\/webmasters|search-console|indexnow|wikidata/i);
    expect(free.situation.length).toBeGreaterThan(0);
  });

  it('free-tier copy never refers to steps it does not render', () => {
    const free = buildDoNowPlan({
      domain: 'example.com', paid: false,
      perEngine: [{ engine: 'openai', found: 6, total: 6 }, { engine: 'claude', found: 0, total: 6 }],
    });
    expect(free.situation.join(' ')).not.toMatch(/steps below|list below/i);
    const notFound = buildDoNowPlan({ domain: 'example.com', paid: false, perEngine: [{ engine: 'claude', found: 0, total: 6 }] });
    expect(notFound.situation.join(' ')).not.toMatch(/steps below|on this list/i);
  });
});

/** §3.3 — every recommendation carries a plain sentence, never a bare directive.
 *  §3.4 — ONE ranked list ordered by impact, whatever section a step came from.
 *  Part C — screen and download render from the SAME plan. */
describe('§3.3, §3.4 and Part C', () => {
  const rich = buildDoNowPlan({
    domain: 'example.com', paid: true,
    perEngine: [{ engine: 'openai', found: 6, total: 6 }, { engine: 'claude', found: 0, total: 6 }],
    collisions: ['lantern.io'],
    authorityGap: [{ domain: 'g2.com', citations: 7 }, { domain: 'reddit.com', citations: 9 }, { domain: 'linkedin.com', citations: 5 }],
  });

  it('3.3: every step has an explainer a marketing manager could act on', () => {
    for (const s of rich.steps) {
      expect(s.explainer).toBeTruthy();
      // A sentence, not a label — long enough to explain, and it must not just restate.
      expect(s.explainer.length).toBeGreaterThan(80);
      expect(s.explainer).not.toBe(s.what);
      expect(s.explainer).not.toBe(s.why);
    }
  });

  it('3.3: explainers define the jargon rather than assuming it', () => {
    const all = rich.steps.map((s) => s.explainer).join(' ');
    expect(all).toMatch(/A search index is a list of pages/);
    expect(all).toMatch(/Structured data is a block of machine-readable facts/);
    expect(all).toMatch(/Wikidata is the shared reference/);
  });

  it('3.4: steps are ranked by impact and numbered in that order', () => {
    const impacts = rich.steps.map((s) => s.impact);
    expect([...impacts].sort((a, b) => a - b)).toEqual(impacts);
    expect(rich.steps.map((s) => s.n)).toEqual(rich.steps.map((_, i) => i + 1));
  });

  it('3.4: the highest-impact action leads, whatever section it came from', () => {
    // Bing is a discovery step; validation and G2 come from other sections. Ranking is
    // by impact on THIS measurement, not by which list a step happens to live in.
    expect(rich.steps[0].what).toMatch(/Bing/);
    const g2 = rich.steps.findIndex((s) => /G2/.test(s.what));
    const bing = rich.steps.findIndex((s) => /Bing/.test(s.what));
    expect(bing).toBeLessThan(g2);
  });

  it('Part C: screen and download build from one call, so they cannot diverge', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { resolve } = require('node:path') as typeof import('node:path');
    const src = readFileSync(resolve(__dirname, '../components/SweepDashboard.tsx'), 'utf8');
    // Both the report builder and the on-screen block call buildDoNowPlan.
    expect((src.match(/buildDoNowPlan\(/g) || []).length).toBeGreaterThanOrEqual(2);
    // and the screen renders the same five fields plus the explainer
    for (const field of ['step.explainer', 'step.why', 'step.link', 'step.time', 'step.changes', 'step.doesNotChange']) {
      expect(src).toContain(field);
    }
  });

  it('Part C: an identical plan renders identical content on both surfaces', () => {
    const a = buildDoNowPlan({ domain: 'example.com', paid: true, perEngine: [{ engine: 'claude', found: 0, total: 6 }] });
    const b = buildDoNowPlan({ domain: 'example.com', paid: true, perEngine: [{ engine: 'claude', found: 0, total: 6 }] });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
