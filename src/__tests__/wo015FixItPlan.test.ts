import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildFixItPlan, fixItPlanMarkdown, diagnose, classifyHost, noPrice, FILL, VENDOR_LINE, type PlanInput } from '../lib/fixItPlan';
import { classifyQuery, band, deriveStanding, exportFromCsv, exportFromXlsx, toStored, comparesNamedVendors } from '../lib/searchStanding';
import { pageContactRoute, pageSellsProduct, type SourceCoverage } from '../lib/sourceCoverage';
import { experimentSection, CAUSAL_WORDS, type RecordEntry } from '../lib/theRecord';
import { seriesOf } from '../lib/recordStore';

/** WO-AEO-FIX-IT-PLAYBOOK-015: the customer's own step-by-step plan, from their own sweep. */

const run = (o: Partial<any>): any => ({ engine: 'claude', query: 'q', queryType: 'category', runIndex: 0, transcript: 'An answer.', sources: [] as string[], costUsd: 0, cited: false, domainCited: false, ...o });
const branded = (found: number, of: number) => Array.from({ length: of }, (_, i) => run({ queryType: 'branded', query: 'what is x.com', runIndex: i, cited: i < found, domainCited: i < found, transcript: 'X (x.com) is a tool.', sources: ['https://x.com/'] }));
const cov = (rows: any[]): SourceCoverage => ({ fetchedAt: '2026-11-01T12:00:00Z', distinctSites: 40, rows });
const base = (o: Partial<PlanInput> = {}): PlanInput => ({ domain: 'x.com', brand: 'X', runs: [...branded(9, 10)], vendors: [{ name: 'RivalCo', domain: 'rivalco.com' }], truth: null, coverage: null, ...o });

describe('diagnosis: one line, consistent with the 90% rule', () => {
  it('found below 90% → discovery; 90%+ and accuracy below 90% → wrong facts; both 90%+ and recommended below 10% → off your site', () => {
    expect(diagnose({ foundPct: 89, accPct: 100, recPct: 0 }).line).toBe("Engines don't reliably find you yet");
    expect(diagnose({ foundPct: 90, accPct: 89, recPct: 0 }).line).toBe('Engines find you but say things that are wrong');
    expect(diagnose({ foundPct: 90, accPct: 90, recPct: 9 }).line).toBe("Engines know you but don't recommend you: the next steps are off your site");
    expect(diagnose({ foundPct: 90, accPct: 90, recPct: 10 }).line).toBe('Keep measuring; work the lanes in order.');
  });
  it('the plan opens with that one diagnosis and nowhere says "accuracy problem, not a discovery problem"', () => {
    const md = fixItPlanMarkdown(buildFixItPlan(base({ runs: branded(7, 10) }))).join('\n');
    expect(md).toContain("**Engines don't reliably find you yet.**");
    expect(md).not.toMatch(/accuracy problem, not a discovery problem/i);
  });
});

describe('lane order, and competitor questions never get a page', () => {
  const runs = [...branded(10, 10),
    run({ query: 'RivalCo vs OtherCo for small teams', sources: ['https://dev.to/a', 'https://www.g2.com/categories/x'] }),
    run({ query: 'how to track brand mentions in AI answers', sources: ['https://dev.to/a', 'https://www.g2.com/categories/x'] }),
    run({ query: 'best tools for tracking AI answers', sources: ['https://www.g2.com/categories/x'] })];
  const p = buildFixItPlan(base({ runs, vendors: [{ name: 'RivalCo', domain: 'rivalco.com' }, { name: 'OtherCo', domain: 'otherco.com' }], score: { score: 90, checklist: [] } }));
  it('steps run Lane 1, 2, 3, 4 in that order, each with owner, minutes, Done when and next-sweep line', () => {
    const lanes = p.steps.map((s) => s.lane);
    expect(lanes).toEqual([...lanes].sort((a, b) => a - b));
    for (const s of p.steps) { expect(['Site', 'Content', 'Outreach']).toContain(s.owner); expect(s.doneWhen).toBeTruthy(); expect(s.nextSweepShows).toBeTruthy(); }
    const md = fixItPlanMarkdown(p).join('\n');
    const at = (t: string) => md.indexOf(t);
    expect(at('Lane 0')).toBeLessThan(at('Lane 1')); expect(at('Lane 1')).toBeLessThan(at('Lane 2')); expect(at('Lane 2')).toBeLessThan(at('Lane 3')); expect(at('Lane 3')).toBeLessThan(at('Lane 4'));
  });
  it('no answer-first page for a comparison of two named competitors or a shortlist question; a procedure question gets one', () => {
    const pages = p.steps.filter((s) => s.key.startsWith('lane4:page:')).map((s) => s.title);
    expect(pages.join('|')).not.toMatch(/RivalCo vs OtherCo|best tools/);
    expect(pages.join('|')).toMatch(/how to track brand mentions in AI answers/);
  });
  it('a score of 85 or more gives the one "ready" line instead of site fixes', () => {
    expect(p.steps.some((s) => s.title.startsWith('Your site is ready to be cited.'))).toBe(true);
    const low = buildFixItPlan(base({ runs, score: { score: 84, checklist: [{ category: 'Schema', action: 'Add Organization JSON-LD', priority: 'High' }] } }));
    expect(low.steps.some((s) => s.title === 'Add Organization JSON-LD')).toBe(true);
  });
});

describe('vendor classification of every Source coverage row', () => {
  const vendors = ['rivalco.com', 'agencyco.com'];
  it('named product → vendor-owned; named but no product on its own site → independent (agency rule); product signals → vendor-owned; listings and open publishing → self-serve', () => {
    expect(classifyHost('blog.rivalco.com', vendors, true, true).kind).toBe('vendor-owned');
    expect(classifyHost('rivalco.com', vendors).kind).toBe('vendor-owned'); // page not read: the answers decide
    expect(classifyHost('agencyco.com', vendors, false, true).kind).toBe('independent');
    expect(classifyHost('toolmaker.ai', vendors, true, true).kind).toBe('vendor-owned');
    expect(classifyHost('www.g2.com', vendors).kind).toBe('self-serve');
    expect(classifyHost('dev.to', vendors, true, true).kind).toBe('self-serve');
    expect(classifyHost('nicklafferty.com', vendors, false, true).kind).toBe('independent');
  });
  it('for a local business: directories are self-serve, a named competitor stays vendor-owned, and a data site selling software is independent', () => {
    expect(classifyHost('www.houzz.com', ['houzz.com'], false, true, false).kind).toBe('self-serve');
    expect(classifyHost('rivalpools.com', ['rivalpools.com'], false, true, false).kind).toBe('vendor-owned');
    expect(classifyHost('cbinsights.com', [], true, true, false).kind).toBe('independent');
  });
  it('vendor-owned pages are listed last, collapsed, with the one line; Wikipedia is never a pitch', () => {
    const p = buildFixItPlan(base({ coverage: cov([
      { host: 'rivalco.com', url: 'https://rivalco.com/blog/best', timesCited: 30, engines: ['Claude'], verdict: 'no', sellsProduct: true },
      { host: 'publisher.com', url: 'https://publisher.com/best?utm_source=openai', timesCited: 9, engines: ['Claude'], verdict: 'no', title: 'Best tools, From $29/mo', byline: 'Jane Writer', sellsProduct: false },
      { host: 'wikipedia.org', url: 'https://en.wikipedia.org/wiki/X', timesCited: 8, engines: ['Claude'], verdict: 'no', sellsProduct: false },
    ]) }));
    expect(p.vendors.map((v) => v.host)).toEqual(['rivalco.com']);
    expect(p.pitch.map((r) => r.host)).toEqual(['publisher.com']);
    expect(p.pitch[0].url).toBe('https://publisher.com/best');
    const md = fixItPlanMarkdown(p).join('\n');
    expect(md.indexOf('publisher.com')).toBeLessThan(md.indexOf('vendor-owned page'));
    expect(md).toContain(VENDOR_LINE);
    expect(md).not.toMatch(/\$\s?\d/); // no price, even inside another site's title
  });
});

describe('no invented contacts', () => {
  it('a pitch row shows a contact only when the page itself published one; otherwise "Fill in:"', () => {
    const p = buildFixItPlan(base({ coverage: cov([
      { host: 'a.com', url: 'https://a.com/x', timesCited: 5, engines: ['Claude'], verdict: 'no', sellsProduct: false, contact: { kind: 'author', value: 'https://a.com/author/jane' } },
      { host: 'b.com', url: 'https://b.com/y', timesCited: 4, engines: ['Claude'], verdict: 'no', sellsProduct: false },
    ]) }));
    expect(p.pitch[0].contact).toBe('Author page: https://a.com/author/jane');
    expect(p.pitch[1].contact.startsWith(FILL)).toBe(true);
    expect(p.pitch[1].contact).not.toMatch(/@/);
  });
  it('the contact reader takes only same-site links and published mailto addresses, never composes one', () => {
    const html = '<a rel="author" href="https://other.com/author/x">x</a><a href="/author/jane-doe">Jane</a><a href="mailto:tips@example.com">tips</a>';
    expect(pageContactRoute(html, 'https://example.com/post')).toEqual({ kind: 'author', value: 'https://example.com/author/jane-doe' });
    expect(pageContactRoute('<a href="https://elsewhere.com/contact">c</a>', 'https://example.com/post')).toBeUndefined();
    expect(pageContactRoute('<p>Write to jane@example.com</p>', 'https://example.com/post')).toBeUndefined();
  });
  it('product signals: a trial or demo link counts; a newsletter "Subscribe" or another site\'s app does not', () => {
    expect(pageSellsProduct('<a href="/signup">Start free trial</a>', 'https://tool.ai/')).toBe(true);
    expect(pageSellsProduct('<a href="#/portal/signup">Subscribe</a>', 'https://blog.me.com/')).toBe(false);
    expect(pageSellsProduct('<a href="https://app.other.com/">Open app</a>', 'https://blog.me.com/')).toBe(false);
    expect(pageSellsProduct('<button>Book a demo</button>', 'https://tool.ai/', true)).toBe(true);
  });
});

describe('Lane 0: query classes, position bands, upload parsing, nothing raw retained', () => {
  const ctx = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers', people: ['Lindsay Hiebert'], vendorNames: ['Profound', 'AthenaHQ', 'Scrunch AI', 'Peec AI'] };
  it('classes and bands', () => {
    const b = { name: ctx.brand, domain: ctx.domain, people: ctx.people };
    expect(classifyQuery('aeo analyzer', b)).toBe('brand');
    expect(classifyQuery('lindsay hiebert', b)).toBe('brand');
    expect(classifyQuery('aeo checking tools', b)).toBe('category');
    expect(classifyQuery('is there an analyzer that scores my pages for answer engine readiness?', b)).toBe('specific');
    expect(classifyQuery('aeo tool to diagnose why i dropped out of perplexity citations', b)).toBe('specific');
    expect([band(10), band(10.1), band(30), band(31)]).toEqual(['page1', 'close', 'close', 'far']);
    expect(comparesNamedVendors('top aeo platforms ranked: profound, athenahq, scrunch ai, peec ai', ctx.vendorNames)).toBe(true);
  });
  const csv = 'Top queries,Clicks,Impressions,CTR,Position\n"aeo analyzer",5,364,1.37%,16.08\naeo checking tools,0,46,0%,74.28\n"is there an analyzer that scores my pages for answer engine readiness?",0,1,0%,4\n"top aeo platforms ranked: profound, athenahq, scrunch ai, peec ai",0,1,0%,7\n';
  it('parses a CSV export and derives classes, the page, winnable, close and far', () => {
    const s = deriveStanding(exportFromCsv(csv, 'Top pages,Clicks,Impressions,CTR,Position\nhttps://aeoanalyzers.com/,9,455,2%,16.75\nhttps://aeoanalyzers.com/best-aeo-tools,0,302,0%,67.96\n'), ctx);
    expect(s.classes.find((c) => c.cls === 'brand')!.band).toBe('close');
    expect(s.categoryPage!.url).toBe('https://aeoanalyzers.com/best-aeo-tools');
    expect(s.winnable.map((q) => q.key)).toEqual(['is there an analyzer that scores my pages for answer engine readiness?']);
    expect(s.far.map((q) => q.key)).toEqual(['aeo checking tools']);
  });
  it('parses an .xlsx export (Queries, Pages and Filters sheets)', async () => {
    const z = new JSZip();
    const sheet = (rows: (string | number)[][]) => `<worksheet><sheetData>${rows.map((r) => `<row>${r.map((c) => typeof c === 'number' ? `<c><v>${c}</v></c>` : `<c t="inlineStr"><is><t>${c}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
    z.file('xl/workbook.xml', '<workbook><sheets><sheet name="Queries" sheetId="1" r:id="rId1"/><sheet name="Pages" sheetId="2" r:id="rId2"/><sheet name="Filters" sheetId="3" r:id="rId3"/></sheets></workbook>');
    z.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Target="worksheets/sheet3.xml"/></Relationships>');
    z.file('xl/worksheets/sheet1.xml', sheet([['Top queries', 'Clicks', 'Impressions', 'CTR', 'Position'], ['aeo analyzer', 5, 364, 0.01, 16.08], ['aeo scanner', 0, 1, 0, 9]]));
    z.file('xl/worksheets/sheet2.xml', sheet([['Top pages', 'Clicks', 'Impressions', 'CTR', 'Position'], ['https://aeoanalyzers.com/best-aeo-tools', 0, 302, 0, 67.96]]));
    z.file('xl/worksheets/sheet3.xml', sheet([['Filter', 'Value'], ['Date', 'Last 3 months']]));
    const exp = await exportFromXlsx(await z.generateAsync({ type: 'uint8array' }), (b) => JSZip.loadAsync(b) as any);
    expect(exp.period).toBe('Last 3 months');
    expect(exp.queries.map((q) => [q.key, q.position])).toEqual([['aeo analyzer', 16.08], ['aeo scanner', 9]]);
    expect(exp.pages[0].key).toBe('https://aeoanalyzers.com/best-aeo-tools');
  });
  it('only the derived table is stored: no raw file, no extra columns', () => {
    const stored = toStored(deriveStanding(exportFromCsv(csv), ctx));
    expect(Object.keys(stored).sort()).toEqual(['categoryPage', 'classes', 'close', 'far', 'period', 'queries', 'source', 'winnable']);
    for (const q of stored.queries) expect(Object.keys(q).sort()).toEqual(['band', 'clicks', 'cls', 'comparesNamed', 'impressions', 'key', 'position']);
    expect(JSON.stringify(stored)).not.toMatch(/Top queries|CTR/);
  });
});

describe('the one next step: one box, chosen by the rules in order', () => {
  const runs = [...branded(7, 10), run({ query: 'best tools', sources: ['https://www.g2.com/x'] })];
  const standing = deriveStanding(exportFromCsv('Top queries,Clicks,Impressions,CTR,Position\naeo analyzer,5,364,1%,16\n"is there an analyzer that scores my pages for answer engine readiness?",0,1,0%,4\n'), { domain: 'x.com', brand: 'AEO Analyzers' });
  it('rule 1: a page-1 specific question with no recommendation → measure it', () => {
    expect(buildFixItPlan(base({ runs, standing })).oneNextStep!.title).toMatch(/^Measure it/);
  });
  it('rule 2: name searches at 11–30 → homepage title and description', () => {
    const s2 = deriveStanding(exportFromCsv('Top queries,Clicks,Impressions,CTR,Position\nx tool,5,364,1%,16\n'), { domain: 'x.com', brand: 'X' });
    expect(buildFixItPlan(base({ runs, standing: s2 })).oneNextStep!.title).toBe('Fix your homepage title and description');
  });
  it('rule 3: a fitting self-serve host at or above the scaled bar → list there', () => {
    const many = [...branded(7, 10), ...Array.from({ length: 10 }, (_, i) => run({ runIndex: i, query: `q${i}`, sources: ['https://www.g2.com/categories/crm'] }))];
    expect(buildFixItPlan(base({ runs: many })).oneNextStep!.title).toBe('List on G2');
  });
  it('the bar scales with sweep size: 10 at 200 category answers, never below 2', async () => {
    const { nextStepThreshold } = await import('../lib/fixItPlan');
    expect([nextStepThreshold(200), nextStepThreshold(40), nextStepThreshold(10)]).toEqual([10, 2, 2]);
  });
  it('3a: below the bar, the most-cited fitting listing; 3b: none cited, the best catalog fit for the type; never a data site', () => {
    const local = { businessType: 'local' as const };
    const few = [...branded(10, 10), run({ query: 'pool builders near me', sources: ['https://www.houzz.com/pro/x', 'https://www.cbinsights.com/company/y'] })];
    expect(buildFixItPlan(base({ runs: few, ...local })).oneNextStep!.title).toBe('List on Houzz');
    const none = [...branded(10, 10), run({ query: 'pool builders near me', sources: ['https://www.cbinsights.com/company/y', 'https://www.crunchbase.com/organization/z'] })];
    const p = buildFixItPlan(base({ runs: none, ...local, coverage: cov([{ host: 'cbinsights.com', url: 'https://www.cbinsights.com/company/y', timesCited: 9, engines: ['Claude'], verdict: 'no', sellsProduct: true }]) }));
    expect(p.oneNextStep!.title).toBe('List on Google Business Profile');
    expect(p.oneNextStep!.title).not.toMatch(/cbinsights|crunchbase/i);
  });
});

describe('experiment log and series', () => {
  const e: RecordEntry = { domain: 'x.com', title: 'Homepage title', owner_tag: 'Site', source: 'own', done_at: '2026-11-01', metric: 'Search Console position for "aeo analyzer"', metric_key: 'gsc_position:aeo analyzer', baseline: '16.1', check_dates: ['2026-11-16', '2026-11-30'] };
  it('before the check date: "checked on"; on it: then and now; no causal wording', () => {
    const before = experimentSection([e], new Date('2026-11-10T12:00:00Z'), () => '9.4').join('\n');
    expect(before).toContain('checked on 2026-11-16');
    expect(before).not.toContain('9.4');
    const after = experimentSection([e], new Date('2026-11-16T12:00:00Z'), () => '9.4').join('\n');
    expect(after).toContain('| 16.1 | 2026-11-16, 2026-11-30 | 9.4 |');
    expect(after).not.toMatch(CAUSAL_WORDS);
  });
  it('a differentiator sweep is its own series, never the main one', () => {
    expect(seriesOf({ panel: { series: 'differentiator' } })).toBe('differentiator');
    expect(seriesOf({ panel: { version: 'v1.1' } })).toBe('main');
    expect(seriesOf(null)).toBe('main');
  });
  it('no price ever reaches the plan', () => {
    expect(noPrice('The 5 Best Alternatives in 2026, From $29/mo')).toBe('The 5 Best Alternatives in 2026');
    expect(noPrice('Pro at $149/month')).not.toMatch(/\$/);
  });
});
