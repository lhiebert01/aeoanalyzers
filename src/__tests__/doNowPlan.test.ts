import { describe, it, expect } from 'vitest';
import { buildDoNowPlan, classifyProblem, STRUCTURED_DATA_RULE } from '../lib/doNowPlan';
import { publishableCollisions } from '../lib/schemaGenerator';
import { answerShape, buildSweepActionAgenda } from '../lib/sweepActions';
import { VALIDATE_MARKUP_NOTE } from '../lib/doNowPlan';

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
    // The validator is no longer a step — founder ruling, Sep 18 2026: no step that
    // moves nothing. Whatever steps this customer gets, each must declare a real layer.
    for (const st of p.steps) expect(['discovery', 'accuracy', 'citation']).toContain(st.moves);
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
    expect(g2.doesNotChange).toMatch(/needs real customer reviews/);
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
    expect(r!.doesNotChange).toMatch(/no astroturfing/i);
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
    expect(VALIDATE_MARKUP_NOTE).toMatch(/Structured data is a block of machine-readable facts/);
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

/** THE GATE FOLLOWS THE VIEWER, NOT THE RUN — found Sep 8 2026 while writing the
 *  check-7 instructions, by asking what `result.tier` is in a rebuilt saved sweep.
 *
 *  It was nothing. The saved-view reconstruction built a SweepResponse with no `tier`
 *  field, and the gate reads `result.tier !== 'free'` — which is true for `undefined`.
 *  So every saved sweep rendered the paid step-by-step to whoever opened it.
 *
 *  Not reachable by an account that never paid: a free sweep is a quick check and is
 *  never persisted, so a never-paid account has no saved sweep to open. Reachable by
 *  the one account that does have both — a Pro subscriber whose plan lapses. They keep
 *  every stored sweep and read it as a free user.
 *
 *  The component is not unit-mountable here, so this asserts on its source. Prove it by
 *  deleting the `tier:` line from the reconstruction: this test goes red. */
describe('the paid gate in a saved sweep follows the viewer', () => {
  const src = () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { resolve } = require('node:path') as typeof import('node:path');
    return readFileSync(resolve(__dirname, '../components/SweepDashboard.tsx'), 'utf8');
  };

  it('the rebuilt result carries a tier derived from the viewer, not left undefined', () => {
    expect(src()).toMatch(/tier:\s*\(isAdmin \|\| isPaidUser\) \? 'paid' : 'free'/);
  });

  it('the component takes the viewer entitlement as a prop', () => {
    expect(src()).toMatch(/isPaidUser\?: boolean/);
  });

  it('App passes it, so the prop is not silently undefined in production', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { resolve } = require('node:path') as typeof import('node:path');
    expect(readFileSync(resolve(__dirname, '../App.tsx'), 'utf8')).toContain('isPaidUser={isPaidUser}');
  });
});

/** WO-AEO-TIER-LEAK follow-on, Sep 18 2026 — three things the product told the founder
 *  that were slightly wrong, found by reading a real report of aeoanalyzers.com as a
 *  customer rather than by any test. Each is a sentence the customer was invited to act
 *  on, so "slightly wrong" meant wasted days or bad copy on their own site. */
describe('the instructions the report gives are ones a customer can safely follow', () => {
  describe('the paste-ready unaffiliation line names only nameable entities', () => {
    // The real collision list from the Sep 18 sweep. Three domains and three Wikipedia
    // disambiguation hits that arrived with their source prefix attached.
    const REAL = [
      'aeoanalyzer.com', 'Wikipedia: aea investors', 'Wikipedia: aer',
      'Wikipedia: aeon display and security system', 'aeoanalytics.com', 'aeoanalyzer.it',
    ];

    it('drops a knowledge-base hit, because "not affiliated with aer" is unbackable', () => {
      const out = publishableCollisions(REAL);
      expect(out).toEqual(['aeoanalyzer.com', 'aeoanalytics.com', 'aeoanalyzer.it']);
      for (const o of out) expect(o).not.toMatch(/Wikipedia/i);
    });

    it('never puts a prefixed label in the line the customer pastes', () => {
      const agenda = buildSweepActionAgenda({
        domain: 'aeoanalyzers.com', brand: 'AEO Analyzers',
        brandedRetrievabilityPct: 100, categoryWinPct: 0,
        hasFidelityOrCollision: true, collisions: REAL,
        losingCategoryQuestions: [], doNowAuthorities: [],
        served: { hasOrg: true, hasOrgId: true, hasDisambiguation: true, sameAs: ['x'] } as any,
      } as any).join('\n');
      const pasteLine = agenda.split('\n').find((l) => l.includes('not affiliated with')) || '';
      expect(pasteLine).toContain('aeoanalyzer.com');
      expect(pasteLine).not.toMatch(/Wikipedia/i);
    });

    it('still keeps every collision in the FINDING — the split is deliberate', () => {
      const agenda = buildSweepActionAgenda({
        domain: 'aeoanalyzers.com', brand: 'AEO Analyzers',
        brandedRetrievabilityPct: 100, categoryWinPct: 0,
        hasFidelityOrCollision: true, collisions: REAL,
        losingCategoryQuestions: [], doNowAuthorities: [],
        served: { hasOrg: true, hasOrgId: true, hasDisambiguation: true, sameAs: ['x'] } as any,
      } as any).join('\n');
      // "an engine has something else under this name" is worth reporting, prefix included
      expect(agenda).toMatch(/Wikipedia: aea investors/);
    });

    it('an owned domain is never disclaimed', () => {
      expect(publishableCollisions(['aeoanalyzers.com', 'aeoanalyzer.com'], ['aeoanalyzers.com']))
        .toEqual(['aeoanalyzer.com']);
    });
  });

  describe('a question that asks for a procedure is not scored as a lost comparison', () => {
    it('classifies the two real advice-shaped questions from the Sep 18 panel', () => {
      expect(answerShape('how do I get my business recommended when people ask ChatGPT for product recommendations')).toBe('advice');
      expect(answerShape("why isn't my website showing up in Google AI Overviews and how to fix it")).toBe('advice');
    });

    it('a list request stays a list request even in how-shaped clothing', () => {
      expect(answerShape('free tool to check if my brand appears in perplexity and copilot answers')).toBe('recommendation');
      expect(answerShape('best answer engine optimization platforms for agencies managing multiple clients')).toBe('recommendation');
      expect(answerShape('affordable alternative to Profound for tracking brand mentions in AI engines')).toBe('recommendation');
      expect(answerShape('how do I choose the best AEO software')).toBe('recommendation');
    });

    it('the agenda separates them and says a zero there is weaker evidence', () => {
      const agenda = buildSweepActionAgenda({
        domain: 'x.com', brand: 'X', brandedRetrievabilityPct: 100, categoryWinPct: 0,
        hasFidelityOrCollision: false, collisions: [],
        losingCategoryQuestions: [
          'best AEO tools for agencies',
          "why isn't my website showing up in Google AI Overviews and how to fix it",
        ],
        doNowAuthorities: [],
      } as any).join('\n');
      expect(agenda).toContain('Write the page that answers: "best AEO tools for agencies"');
      expect(agenda).toContain('Read these');
      expect(agenda).toContain('weaker evidence');
      expect(agenda).toContain('not that you lost a comparison');
    });

    it('says nothing of the sort when every losing question asks for a shortlist', () => {
      const agenda = buildSweepActionAgenda({
        domain: 'x.com', brand: 'X', brandedRetrievabilityPct: 100, categoryWinPct: 0,
        hasFidelityOrCollision: false, collisions: [],
        losingCategoryQuestions: ['best AEO tools for agencies', 'top AEO software'],
        doNowAuthorities: [],
      } as any).join('\n');
      expect(agenda).not.toContain('weaker evidence');
    });
  });

  describe('a count of one is not a demonstrated pattern', () => {
    // reddit.com carries no citation threshold — it is participation on the most-cited
    // domain, not a directory listing — so it exercises the phrasing at a count of one.
    // g2.com no longer renders at one at all, which is the point of the rule.
    const plan = (citations: number, domain = 'reddit.com') => buildDoNowPlan({
      domain: 'x.com', paid: true,
      perEngine: [{ engine: 'claude', found: 2, total: 2 }],
      authorityGap: [{ domain, citations }],
    } as any);

    it('reads grammatically at one, which it did not', () => {
      const why = plan(1).steps.map((s) => s.why).join(' ');
      expect(why).toContain('cited once');
      expect(why).not.toContain('1 times');
    });

    it('does not claim "demonstrably" anywhere, at any count', () => {
      for (const n of [1, 3, 7]) {
        expect(plan(n).steps.map((s) => s.why).join(' ')).not.toMatch(/demonstrably/);
        expect(plan(n, 'g2.com').steps.map((s) => s.why).join(' ')).not.toMatch(/demonstrably/);
      }
    });

    it('claims a repeated pattern only where the threshold guarantees one', () => {
      // g2 renders only at three or more, so the claim is true whenever it is printed.
      const why = plan(7, 'g2.com').steps.map((s) => s.why).join(' ');
      expect(why).toContain('cited 7 times');
      expect(why).toContain('repeatedly used');
      expect(plan(1, 'g2.com').steps.map((s) => s.what).join(' ')).not.toMatch(/G2/);
    });
  });
});

/** Founder ruling, Sep 18 2026, twice in one hour: "we only want clear succinct helpful
 *  instructions that can or DO improve the answers AI engines give — if the steps do not
 *  help, then they should not direct users to follow steps that accomplish nothing."
 *
 *  Two enforceable halves. Every step must move a measured layer, and every step must be
 *  short enough to read. Both are guards rather than review notes, because prose grows
 *  back and a passing suite is the only thing that notices. */
describe('every step earns its place and says which layer it moves', () => {
  const rich = () => buildDoNowPlan({
    domain: 'aeoanalyzers.com', paid: true,
    perEngine: [{ engine: 'Claude', found: 2, total: 2 }, { engine: 'ChatGPT', found: 2, total: 2 }],
    collisions: ['aeoanalyzer.com', 'aeoanalytics.com'],
    authorityGap: [{ domain: 'g2.com', citations: 5 }, { domain: 'linkedin.com', citations: 3 }, { domain: 'reddit.com', citations: 3 }],
    pitchTargets: [{ domain: 'rankability.com', citations: 9 }, { domain: 'useomnia.com', citations: 7 }, { domain: 'brightedge.com', citations: 7 }],
  } as any);

  it('declares a layer on every step, and only one of the three', () => {
    for (const s of rich().steps) {
      expect(['discovery', 'accuracy', 'citation'], `step ${s.n}: ${s.what}`).toContain(s.moves);
    }
  });

  it('carries no step that moves nothing — the markup validator is gone from the list', () => {
    const plan = rich();
    const whats = plan.steps.map((s) => s.what).join(' | ');
    expect(whats).not.toMatch(/Validate the markup/i);
    // and nothing else sneaked in claiming to change nothing an engine says
    for (const s of plan.steps) {
      expect(s.changes.toLowerCase(), `step ${s.n} promises nothing`).not.toMatch(/^nothing\b/);
      expect(s.doesNotChange).not.toMatch(/not an improvement/i);
    }
  });

  it('the validator note still exists, travelling with the markup it guards', () => {
    expect(VALIDATE_MARKUP_NOTE).toContain('validator.schema.org');
    expect(VALIDATE_MARKUP_NOTE).toContain('does not change anything an engine says');
  });

  it('a directory is an action only once their own data cites it three times', () => {
    const thin = buildDoNowPlan({
      domain: 'x.com', paid: true, perEngine: [{ engine: 'Claude', found: 2, total: 2 }],
      authorityGap: [{ domain: 'g2.com', citations: 1 }],
    } as any);
    expect(thin.steps.map((s) => s.what).join(' ')).not.toMatch(/G2/);
    const thick = buildDoNowPlan({
      domain: 'x.com', paid: true, perEngine: [{ engine: 'Claude', found: 2, total: 2 }],
      authorityGap: [{ domain: 'g2.com', citations: 3 }],
    } as any);
    expect(thick.steps.map((s) => s.what).join(' ')).toMatch(/G2/);
  });

  it('offers the highest-evidence citation step when the data supports it', () => {
    const plan = rich();
    const pitch = plan.steps.find((s) => /already answer your category questions/.test(s.what));
    expect(pitch, 'the pitch step must be offered').toBeTruthy();
    // it names THEIR pages, not a generic list
    expect(pitch!.why).toContain('rankability.com');
    expect(pitch!.moves).toBe('citation');
    // and it outranks the surfaces the customer merely controls
    const reddit = plan.steps.find((s) => /Reddit/.test(s.what))!;
    expect(pitch!.n).toBeLessThan(reddit.n);
  });

  it('never claims Wikidata moves the category number', () => {
    const wd = rich().steps.find((s) => /Wikidata/.test(s.what))!;
    expect(wd.moves).toBe('accuracy');
    expect(wd.doesNotChange).toMatch(/category-win number/);
    expect(wd.doesNotChange).toMatch(/no published evidence/);
  });

  it('keeps every field to at most two sentences — succinct is a rule, not a preference', () => {
    for (const s of rich().steps) {
      for (const f of ['explainer', 'why', 'changes', 'doesNotChange'] as const) {
        const v = s[f];
        const sentences = (v.match(/[.!?](\s|$)/g) || []).length;
        expect(sentences, `step ${s.n} ${f} runs to ${sentences} sentences: ${v}`).toBeLessThanOrEqual(2);
        expect(v.length, `step ${s.n} ${f} is ${v.length} chars`).toBeLessThanOrEqual(300);
      }
    }
  });
});

/** The orphan lesson again: a step the renderers pass no data to is dead code with
 *  passing tests. The pitch step exists only if both surfaces feed it. */
describe('the pitch step is actually wired into both renderers', () => {
  const src = () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { resolve } = require('node:path') as typeof import('node:path');
    return readFileSync(resolve(__dirname, '../components/SweepDashboard.tsx'), 'utf8');
  };

  it('both buildDoNowPlan call sites pass pitchTargets', () => {
    expect((src().match(/pitchTargets: pitchTargetsFrom\(authority\)/g) || []).length).toBe(2);
  });

  it('the targets come from one shared derivation, so the surfaces cannot diverge', () => {
    expect((src().match(/const pitchTargetsFrom = /g) || []).length).toBe(1);
  });

  it('both surfaces print which layer a step moves', () => {
    const s = src();
    expect(s).toContain("out.push(`- Moves: ${step.moves ===");
    expect(s).toContain('<span className="text-zinc-400">Moves:</span>');
  });
});
