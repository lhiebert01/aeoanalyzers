import { describe, it, expect } from 'vitest';
import { buildDoNowPlan, classifyProblem, FOUND_BY_NAME_SETTLED } from '../lib/doNowPlan';
import { buildSweepActionAgenda, sweepAgendaBlocks, comparesTwoNamed, WEAK_RETRIEVABILITY, type SweepActionInputs } from '../lib/sweepActions';
import { coverageAction, coverageKind, categoryVendorDomains, COVERAGE_KIND_LABEL, type SourceCoverage } from '../lib/sourceCoverage';

/** Sweep report fixes, founder rulings 1 Nov 2026. */

const eng = (engine: string, found: number, total = 10) => ({ engine, found, total });
const planText = (p: ReturnType<typeof buildDoNowPlan>) => [...p.situation, ...p.steps.map((s) => `${s.what} ${s.changes}`)].join('\n');

describe('B1. below 90% found by name, the diagnosis is discovery, and the plan agrees', () => {
  // Our own Nov 1 sweep: ChatGPT 1 of 10, the other three 10 of 10 (31 of 40, 78%), and drift.
  const nov = [eng('openai', 1), eng('claude', 10), eng('perplexity', 10), eng('gemini', 10)];

  it('never says "accuracy problem, not a discovery problem"; says discovery and starts with it', () => {
    const p = buildDoNowPlan({ domain: 'aeoanalyzers.com', paid: true, perEngine: nov, drifted: 10 });
    expect(p.problem).toBe('found-unreliably');
    const t = planText(p);
    expect(t).not.toMatch(/accuracy problem/i);
    expect(p.situation[0]).toContain('**You have a discovery problem.**');
    expect(p.situation[0]).toContain('78% of answers (31 of 40); openai 1 of 10');
    expect(p.steps[0].moves).toBe('discovery');
  });

  it('threshold: 35 of 40 is unsettled, 36 of 40 (exactly 90%) and above are settled', () => {
    const at = (chatgpt: number) => classifyProblem([eng('openai', chatgpt), eng('claude', 10), eng('perplexity', 10), eng('gemini', 10)], 2);
    expect(FOUND_BY_NAME_SETTLED).toBe(0.9);
    expect(at(5)).toBe('found-unreliably');        // 35/40 = 87.5%
    expect(at(6)).toBe('found-but-misdescribed');  // 36/40 = 90%
    expect(at(10)).toBe('found-but-misdescribed'); // 40/40
  });

  it('the agenda below the plan agrees: under 90% it opens with "can\'t reliably find you"', () => {
    const inp = (pct: number): SweepActionInputs => ({ brandedRetrievabilityPct: pct, categoryWinPct: 0, hasFidelityOrCollision: false, collisions: [], losingCategoryQuestions: [], doNowAuthorities: [], domain: 'x.com' });
    expect(WEAK_RETRIEVABILITY).toBe(90);
    expect(buildSweepActionAgenda(inp(78)).join('\n')).toContain("can't reliably find you by name (78%)");
    expect(buildSweepActionAgenda(inp(89)).join('\n')).toContain("can't reliably find you");
    expect(buildSweepActionAgenda(inp(90)).join('\n')).not.toContain("can't reliably find you");
  });
});

describe('B2. a question comparing two named competitors is outreach, not a content task', () => {
  const inp: SweepActionInputs = {
    brandedRetrievabilityPct: 100, categoryWinPct: 0, hasFidelityOrCollision: false, collisions: [], doNowAuthorities: [], domain: 'x.com',
    competitorNames: ['Profound', 'Otterly AI', 'Peec AI'],
    losingCategoryQuestions: ['Profound vs Otterly AI for a small agency', 'Is Peec AI or Profound better for tracking ChatGPT?', 'best AI visibility tools for agencies'],
  };
  it('detects comparisons by the entered names and by "A vs B"; not single-name or engine pairs', () => {
    expect(comparesTwoNamed('Is Peec AI or Profound better?', inp.competitorNames)).toBe(true);
    expect(comparesTwoNamed('Semrush vs Ahrefs for audits')).toBe(true);
    expect(comparesTwoNamed('alternatives to Profound', inp.competitorNames)).toBe(false);
    expect(comparesTwoNamed('ChatGPT vs Google for local search')).toBe(false);
  });
  it('the Content block keeps only the non-comparison question; Outreach carries both comparisons', () => {
    const blocks = sweepAgendaBlocks(inp);
    const content = blocks.find((b) => b.key === 'content-agenda')!;
    const outreach = blocks.find((b) => b.key === 'comparison-outreach')!;
    expect(content.lines.join('\n')).toContain('best AI visibility tools for agencies');
    expect(content.lines.join('\n')).not.toMatch(/Profound vs|Peec AI or Profound/);
    expect(outreach.owner).toBe('Outreach');
    expect(outreach.title).toContain('outreach, not a page');
    expect(outreach.lines.join('\n')).toContain('Profound vs Otterly AI for a small agency');
    expect(outreach.lines.join('\n')).toContain('Is Peec AI or Profound better for tracking ChatGPT?');
  });
  it('when every losing question is a comparison, no empty content task is issued', () => {
    const blocks = sweepAgendaBlocks({ ...inp, losingCategoryQuestions: ['Profound vs Otterly AI'] });
    expect(blocks.some((b) => b.key === 'content-agenda')).toBe(false);
  });
});

describe('B3. Source coverage pages are labeled, and outreach runs self-serve, independent, vendor-owned', () => {
  const row = (host: string, timesCited: number) => ({ host, url: `https://${host}/page`, timesCited, engines: ['perplexity'], verdict: 'no' as const });
  const cov: SourceCoverage = { fetchedAt: '2026-11-01T12:00:00Z', distinctSites: 50, rows: [
    row('tryprofound.com', 9), row('nicklafferty.com', 3), row('www.g2.com', 2), row('blog.example-news.com', 5), row('reddit.com', 1),
  ] };
  const vendors = categoryVendorDomains([{ domain: 'tryprofound.com' }], [{ domain: 'otterly.ai' }]);

  it('labels each kind', () => {
    expect(coverageKind('tryprofound.com', vendors)).toBe('vendor-owned');
    expect(coverageKind('blog.otterly.ai', vendors)).toBe('vendor-owned');
    expect(coverageKind('www.g2.com', vendors)).toBe('self-serve');
    expect(coverageKind('nicklafferty.com', vendors)).toBe('independent');
    expect(COVERAGE_KIND_LABEL['vendor-owned']).toBe('vendor-owned (unlikely to add you)');
    expect(COVERAGE_KIND_LABEL.independent).toBe('independent (pitchable)');
    expect(COVERAGE_KIND_LABEL['self-serve']).toBe('self-serve (publish or list yourself)');
  });

  it('orders the outreach list self-serve first, then independent, then vendor-owned last (most cited first within each)', () => {
    const items = coverageAction(cov, vendors)!.items;
    expect(items.map((i) => i.split(': ')[0])).toEqual([
      COVERAGE_KIND_LABEL['self-serve'], COVERAGE_KIND_LABEL['self-serve'],
      COVERAGE_KIND_LABEL.independent, COVERAGE_KIND_LABEL.independent,
      COVERAGE_KIND_LABEL['vendor-owned'],
    ]);
    expect(items[0]).toContain('g2.com');
    expect(items[2]).toContain('blog.example-news.com');
    expect(items[4]).toContain('tryprofound.com');
  });
});
