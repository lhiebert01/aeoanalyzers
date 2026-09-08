import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** WO-AEO-TIER-LEAK-007 — the free tier gave away the question bank and the Word report.
 *
 *  Found by the founder clicking through production in a private window on a real free
 *  account, not by any test here. The check that produced it (green-light item 7) was
 *  written to hunt for leaked FIX recipes, and the recipes were correctly locked. What
 *  leaked was upstream of them: the drafted competitor set and the twelve-question buyer
 *  panel, which is the half of the product that took judgment to build.
 *
 *  These are source assertions because the surfaces are a React component and two
 *  serverless handlers, neither unit-mountable here. Each one is proven by breaking:
 *  undo the line it names and the test goes red. That is weaker than an integration
 *  test and stronger than nothing, and the acceptance evidence for this order is a pull
 *  from a real free account on production, not this file.  */

const read = (rel: string) => readFileSync(resolve(__dirname, '..', '..', rel), 'utf8');

describe('the sweep endpoint refuses a free caller before spending anything', () => {
  const src = read('api/run-sweep.ts');

  it('throws 402 rather than downgrading to a quick check', () => {
    expect(src).toMatch(/const FREE = \(\): never => \{ throw new HttpError\(402, PAYWALL_MESSAGE\); \};/);
  });

  it('refuses a signed-in free user, an anonymous caller, and a bad token alike', () => {
    // Three call sites, so no route into the paid path is left open.
    expect((src.match(/return FREE\(\);/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it('fails CLOSED when entitlement cannot be resolved — this endpoint spends money', () => {
    expect(src).toContain("Could not verify your plan");
    expect(src).not.toMatch(/access = \{ userId: null, tier: 'free', quickCheck: true \};/);
  });

  it('carries no flag that turns the teaser back on', () => {
    // The founder ruled against a teaser three times, once against the work order's
    // own §2.3. A toggle here would invite a future session to flip it.
    expect(src).not.toContain('FREE_TEASER_SWEEP');
  });
});

describe('the shared LLM proxy refuses sweep setup for a non-paying caller', () => {
  const src = read('api/llm-generate.ts');

  it('gates on purpose, before generating rather than redacting after', () => {
    expect(src).toContain("if (purpose === 'sweep-config')");
    expect(src).toMatch(/if \(!gate\.paid\) \{\s*return res\.status\(402\)/);
  });

  it('leaves the analyzer path alone — a free score still works', () => {
    // The analyzer sends no purpose, so it never enters that branch, and its own
    // field-level redaction is untouched.
    expect(src).toContain('if (!ent.paid && ent.determined) text = redactFixFields(text);');
  });
});

describe('the sweep interface runs nothing for a free viewer', () => {
  const src = read('src/components/SweepDashboard.tsx');

  it('derives one flag from the viewer entitlement', () => {
    expect(src).toMatch(/const paidViewer = !!isAdmin \|\| !!isPaidUser;/);
  });

  it('gates the domain box, the confirm step and the result on it', () => {
    expect(src).toContain("{phase === 'input' && !savedView && paidViewer && (");
    expect(src).toContain("{phase === 'confirm' && !savedView && paidViewer && (");
    expect(src).toContain('{result && (paidViewer || savedView) && (');
  });

  it('gates BOTH downloads together, never one and not the other', () => {
    const i = src.indexOf('{paidViewer && (');
    expect(i).toBeGreaterThan(-1);
    const block = src.slice(i, i + 1400);
    expect(block).toContain('Download report (Word)');
    expect(block).toContain('Markdown');
  });

  it('refuses to start the two functions that spend money', () => {
    expect(src).toMatch(/async function analyze\(forceGuess = false\) \{\s*\n\s*if \(!paidViewer\) return;/);
    expect(src).toMatch(/async function run\(\) \{\s*\n\s*if \(!paidViewer\) return;/);
  });

  it('stamps every sweep-setup LLM call so the server can refuse it', () => {
    expect(src).toContain("purpose: 'sweep-config'");
  });

  it('still explains what a sweep is, and offers the Day Pass', () => {
    expect(src).toContain('Citation Sweeps are a paid feature');
    expect(src).toContain('Get a Day Pass or subscribe');
  });
});

describe('the one deliberate free-tier exception is recorded where it lives', () => {
  it('the Bing link in the free diagnosis carries its ruling in the code', () => {
    const src = read('src/lib/indexCoverage.ts');
    expect(src).toContain('THE ONE DELIBERATE EXCEPTION TO THE FREE-TIER FIX WALL');
    expect(src).toContain('WO-AEO-TIER-LEAK-007');
    expect(src).toContain('Do not "harmonise" them.');
  });

  it('the Do-Now step that actually verifies Bing stays gated', () => {
    // Same URL, opposite sides of the wall, on purpose. doNowPlan returns no steps
    // at all on free, so this link cannot reach a free reader from there.
    const plan = read('src/lib/doNowPlan.ts');
    expect(plan).toContain('https://www.bing.com/webmasters');
    expect(plan).toMatch(/gatedNote/);
  });
});
