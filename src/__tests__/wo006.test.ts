import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { panelOf, panelDisclosure, withLocation, testConditionsLines, PANELS, NOT_COVERED } from '../lib/panel';
import { buildSeries, otherPanels } from '../lib/sweepDisclosure';
import { classifyIntent, intentMix, intentMixLine } from '../lib/queryIntent';
import { classifyQuery, segment, parseGscCsv, FANOUT_RULES, FANOUT_LIMITS } from '../lib/fanoutClassifier';

/** WO-AEO-POSITION-AND-PANEL-006. */
describe('Item B — panels: v1.1 unchanged, v1.2 separate, never differenced', () => {
  it('v1.1 is the four engines of record; v1.2 adds Grok', () => {
    expect(PANELS['v1.1'].engines).toEqual(['openai', 'claude', 'perplexity', 'gemini']);
    expect(PANELS['v1.2'].engines).toEqual([...PANELS['v1.1'].engines, 'grok']);
  });
  it('a stored row without a panel field is inferred from its engines', () => {
    expect(panelOf({ engines: [{ engine: 'claude' }, { engine: 'gemini' }] })).toBe('v1.1');
    expect(panelOf({ engines: [{ engine: 'grok' }] })).toBe('v1.2');
    expect(panelOf({ panel: { version: 'v1.2' }, engines: [] })).toBe('v1.2');
  });
  const row = (id: string, date: string, cat: number, panel?: string) => ({ id, domain: 'acme.com', created_at: `${date}T12:00:00Z`, category: 'crm', category_queries: ['best crm'], summary: { ...(panel ? { panel: { version: panel } } : {}), engines: [{ engine: 'claude', brandedRuns: 10, brandedCited: 10, categoryRuns: 10, categoryCited: cat }] } });
  it('PROVE BY BREAKING: a v1.2 sweep never becomes the next point of a v1.1 series, and is reported as a separate panel', () => {
    const rows = [row('a', '2026-09-07', 1), row('b', '2026-10-08', 3), row('c', '2026-10-09', 9, 'v1.2')];
    const s = buildSeries(rows as any, rows[1] as any);
    expect(s.map((p) => p.id)).toEqual(['a', 'b']);
    expect(s[1].deltaCategory).toBe(20);
    expect(otherPanels(rows as any, rows[1] as any)).toEqual(['v1.2']);
    expect(buildSeries(rows as any, rows[2] as any).map((p) => [p.id, p.deltaCategory])).toEqual([['c', null]]);
  });
  it('the disclosure names the engines, what is not covered, and the measured panel effect', () => {
    expect(panelDisclosure('v1.1')).toBe('Measured on ChatGPT, Claude, Perplexity and Gemini (panel v1.1). Not covered: Grok, Google AI Overviews, Google AI Mode, Microsoft Copilot, Meta\'s Muse. A different set of engines gives a different number — in our own September 2026 measurement, adding one engine to the same runs moved the category figure by 14 points.');
    expect(panelDisclosure('v1.2')).toMatch(/and Grok \(panel v1\.2\)\. Not covered: Google AI Overviews, Google AI Mode, Microsoft Copilot, Meta's Muse\./);
    // WO-008: the inline list equals the single source.
    expect(NOT_COVERED).toEqual(JSON.parse(readFileSync('src/data/engines.json', 'utf8')).notCovered);
  });
  it('the sweep route refuses a v1.2 run without Grok rather than mislabel a v1.1 run', () => {
    expect(readFileSync('api/run-sweep.ts', 'utf8')).toMatch(/panelVersion === 'v1\.2' && !process\.env\.XAI_API_KEY\) return res\.status\(400\)/);
  });
});

describe('Item C — test conditions', () => {
  it('the country is named inside the question once, never in a question that already names it', () => {
    expect(withLocation('best CRM for small business', 'United States')).toBe('best CRM for small business in United States');
    expect(withLocation('best CRM in the United States?', 'United States')).toBe('best CRM in the United States?');
    expect(withLocation('best CRM', null)).toBe('best CRM');
  });
  it('the no-personalization and location lines are plain', () => {
    const [p, l] = testConditionsLines({ location: 'United States' });
    expect(p).toMatch(/no account, no chat history and no memory/);
    expect(l).toBe('Location: the country is named inside each buyer question (“United States”), not left to account or device settings.');
    expect(testConditionsLines({ location: null })[1]).toMatch(/no country is named/);
  });
});

describe('Item D — five buyer intents', () => {
  const panel = JSON.parse(readFileSync('docs/baselines/aeoanalyzers-2026-10-08.json', 'utf8')).runs
    .filter((r: any) => r.queryType === 'category').map((r: any) => r.query).filter((q: string, i: number, a: string[]) => a.indexOf(q) === i);
  it('our pinned panel v1.1 mixes all five', () => {
    expect(intentMix(panel)).toEqual({ shortlist: 3, problem: 2, alternatives: 2, comparison: 2, constraint: 1 });
    expect(intentMixLine(panel)).toBe('Question mix: 3 shortlist · 1 constraint · 2 alternatives · 2 comparison · 2 problem (of 10).');
  });
  it('a requirement that is part of the category noun is not a constraint the question adds', () => {
    expect(classifyIntent('best simple CRM for small business', 'simple CRM for small business').intent).toBe('shortlist');
    expect(classifyIntent('affordable simple CRM for small business options', 'simple CRM for small business').intent).toBe('constraint');
    expect(classifyIntent('Profound vs Otterly AI for answer engine optimization').intent).toBe('comparison');
  });
});

describe('Item E — fan-out classification is a classification', () => {
  it('a long instruction asking for a format reads as likely machine-written, with the rules that fired', () => {
    const v = classifyQuery('list the best CRM tools for a small business in 2026 with pricing and integrations, return json no prose');
    expect(v.likelyMachine).toBe(true);
    expect(v.fired).toEqual(expect.arrayContaining(['long-sentence', 'imperative', 'format-instruction', 'return-word']));
    expect(v.confidence).toBeLessThan(1);
  });
  it('a short typed query is likely a person, confidence 0', () => {
    expect(classifyQuery('best crm')).toEqual({ likelyMachine: false, confidence: 0, fired: [] });
  });
  it('separated CTR is recomputed per population from clicks and impressions', () => {
    const s = segment([
      { query: 'best crm', clicks: 30, impressions: 300, position: 4 },
      { query: 'list the best CRM tools for a small business in 2026 with pricing, return json no prose', clicks: 0, impressions: 700, position: 9 },
    ]);
    expect(s.blended.ctr).toBeCloseTo(0.03);
    expect(s.likelyPerson.ctr).toBeCloseTo(0.1);
    expect(s.likelyMachine.ctr).toBe(0);
  });
  it('reads a Search Console Queries export', () => {
    expect(parseGscCsv('Top queries,Clicks,Impressions,CTR,Position\n"best crm, free",12,400,3%,5.2\n')).toEqual([{ query: 'best crm, free', clicks: 12, impressions: 400, position: 5.2 }]);
  });
  it('the rules and the limits are written for the user, and say it is not a fact', () => {
    expect(FANOUT_RULES.every((r) => r.label.length > 10)).toBe(true);
    expect(FANOUT_LIMITS.join(' ')).toMatch(/Google only/);
    expect(FANOUT_LIMITS.join(' ')).toMatch(/not a confirmed fact/);
  });
  it('stays dark: allowlist + OAuth config required; nothing customer-facing names it', () => {
    const api = readFileSync('api/gsc.ts', 'utf8');
    expect(api).toMatch(/if \(!enabled\) return res\.status\(404\)/);
    expect(readFileSync('src/components/SearchConsolePanel.tsx', 'utf8')).toMatch(/if \(!st\?\.enabled\) return null;/);
    for (const f of ['public/pricing/index.html', 'src/components/PricingPage.tsx', 'public/index.html'].filter(existsSync)) expect(readFileSync(f, 'utf8')).not.toMatch(/search console/i);
  });
});

describe('Item A — the two pages are documents, not the homepage shell', () => {
  for (const [slug, title] of [['methodology', 'Methodology: How AEO Analyzers Measures'], ['about', 'About AEO Analyzers and Its Founder, Lindsay Hiebert']]) {
    it(`/${slug}: its own title, canonical, index robots, canonical identity ids, and in the sitemap`, () => {
      const h = readFileSync(`public/${slug}/index.html`, 'utf8');
      expect(h).toContain(`<title>${title}</title>`);
      expect(h).toContain(`<link rel="canonical" href="https://aeoanalyzers.com/${slug}">`);
      expect(h).toContain('content="index,follow');
      expect(h).toContain('"@id": "https://pigenai.com/#lindsay"');
      expect(readFileSync('public/sitemap.xml', 'utf8')).toContain(`<loc>https://aeoanalyzers.com/${slug}</loc>`);
    });
  }
  it('the methodology prints no figure that is not on /evidence, and no retracted one', () => {
    const h = readFileSync('public/methodology/index.html', 'utf8').replace(/<style>[\s\S]*?<\/style>/, '');
    expect(h).not.toMatch(/\b98%|\b265\b|\b55%|\b80%|\b88%|N=\d/); // no series figure, no retracted one
    expect(h).not.toMatch(/100%\s*(?:found|retriev)|found by name[^.]{0,40}100%/i); // the August draft's retracted anchor
    expect(h).toContain('href="/evidence"');
  });
  it('the about page makes no comparison with other tools', () => {
    expect(readFileSync('public/about/index.html', 'utf8')).not.toMatch(/most tools|other tools|only give/i);
  });
});

describe('13 Oct rulings — labels agree everywhere; the two lines are published verbatim', () => {
  it('an export prints the same label text as the screen, never the raw code', async () => {
    const { buildSweepReport } = await import('../lib/sweepReport');
    const { scoreRun, aggregateSweep } = await import('../lib/citationSweep');
    const d = JSON.parse(readFileSync('docs/baselines/aeoanalyzers-2026-10-08.json', 'utf8'));
    const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
    const runs = d.runs.map((r: any) => scoreRun(r, client, []));
    const md = buildSweepReport({ result: { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers', runsPerQuery: 5, engines: [], skippedEngines: [], configured: ['claude', 'openai', 'perplexity', 'gemini'], summary: aggregateSweep(runs, client, []), runs, persisted: true, generatedAt: '2026-10-08T00:00:00Z', tier: 'paid' } as any, competitors: [], fidelity: null, entityLinking: null, authority: null, bots: null, truth: null, pageFactDensity: null, ownedDomains: [], isAdmin: false, savedView: true });
    expect(md).not.toMatch(/\b(?:med|moderate) confidence/);
    expect(md).toContain('N=40 · high confidence');
    expect(md).toContain('confidence is high from 12 answers, medium from 6 to 11, and low under 6');
  });
  const POS = 'A URL, a few minutes, and every transcript behind every number. You decide what to fix, and who fixes it.';
  const IND = 'We do not sell the fix, so the measurement has nothing to prove.';
  for (const f of ['src/components/MarketingLanding.tsx', 'public/methodology/index.html', 'public/about/index.html']) {
    it(`${f} carries both approved lines verbatim`, () => {
      const h = readFileSync(f, 'utf8');
      expect(h).toContain(POS); expect(h).toContain(IND);
    });
  }
});
