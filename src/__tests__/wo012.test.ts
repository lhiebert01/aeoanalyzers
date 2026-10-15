import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Packer } from 'docx';
import { scoreRun, aggregateSweep, type SweepRunResult } from '../lib/citationSweep';
import { buildSweepReport, buildSweepCover, recordActions } from '../lib/sweepReport';
import { buildSweepDocument } from '../services/sweepDocx';
import { buildCover, splitBridge, recommendedLine, SPLIT } from '../lib/reportCover';
import { buildScoreCover } from '../lib/scoreCover';
import { planSourceCoverage, brandMatchers, namesYou, coverageHeadline, coverageAction, corroboration, corroborationLine, vendorBase, vendorBaseLine, MAX_URLS_PER_HOST, MAX_URLS_PER_SWEEP, type SourceCoverage } from '../lib/sourceCoverage';
import { robotsRules, robotsAllows } from '../../api/_lib/sourceFetch';
import { ownerForChecklist, groupChecklist, nextSweepLine, OWNER_ORDER } from '../lib/ownerTags';
import { measuredAfter, recordCsv, recordSection, entriesBetween, CAUSAL_WORDS, PANEL_DIFFERS, MEASURED_AFTER, type RecordEntry, type SweepFigures } from '../lib/theRecord';

/** WO-AEO-REPORT-SOURCE-COVERAGE-012 — page-one split, Source coverage, owner tags, the Record. */
const d = JSON.parse(readFileSync('docs/baselines/aeoanalyzers-2026-09-01.json', 'utf8'));
const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
const comps = [{ name: 'Profound', domain: 'tryprofound.com' }, { name: 'Otterly AI', domain: 'otterly.ai' }];
const runs: SweepRunResult[] = d.runs.map((r: any) => scoreRun(r, client, comps));
const result: any = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers', runsPerQuery: 5, engines: ['claude', 'openai', 'perplexity', 'gemini'], skippedEngines: [], configured: ['claude', 'openai', 'perplexity', 'gemini'], summary: aggregateSweep(runs, client, comps), runs, persisted: true, generatedAt: '2026-10-13T12:00:00Z', tier: 'paid' };
const base = { result, competitors: comps, fidelity: null, entityLinking: null, authority: null, bots: null, truth: null, pageFactDensity: null, ownedDomains: [], isAdmin: false, savedView: true };
const run = (o: Partial<SweepRunResult>): SweepRunResult => ({ engine: 'perplexity', query: 'best aeo tool', queryType: 'category', runIndex: 0, transcript: 'x', sources: [], costUsd: 0, ...o });

const coverage: SourceCoverage = {
  fetchedAt: '2026-10-15T10:00:00Z', distinctSites: 31,
  rows: [
    { host: 'g2.com', timesCited: 9, engines: ['perplexity', 'openai'], url: 'https://www.g2.com/categories/aeo', verdict: 'no' },
    { host: 'reddit.com', timesCited: 4, engines: ['perplexity'], url: 'https://www.reddit.com/r/SEO/x', verdict: 'unreadable', reason: 'robots' },
    { host: 'example-review.com', timesCited: 2, engines: ['gemini'], url: 'https://example-review.com/aeo', verdict: 'yes' },
  ],
};

describe('A — page one: readiness beside recommendation, never blended', () => {
  it('the sweep report opens with both figures and the denominator line', () => {
    const md = buildSweepReport({ ...base, readiness: { score: 90 } });
    const top = md.slice(0, md.indexOf('<!-- pagebreak -->') > 0 ? md.indexOf('<!-- pagebreak -->') : 4000);
    expect(top).toContain(`| ${SPLIT.ready} | ${SPLIT.rec} |`);
    expect(top).toContain('**90/100**');
    expect(top).toContain('What your site controls.');
    expect(top).toMatch(/\d+ of \d+ category answers, four engines, October 13th/);
    expect(top).toContain('https://aeoanalyzers.com/get-recommended');
  });
  it('no AEO Score on record → "Not yet measured" and a way to run one', () => {
    const md = buildCover(buildSweepCover({ ...base, readiness: null })).join('\n');
    expect(md).toContain(`**${SPLIT.notYet}**`);
    expect(md).toContain(SPLIT.runScore);
  });
  it('the score report with no sweep says "Not yet measured" and links to run one', () => {
    const r: any = { score: 72, citationProbability: 40, criteria: [{ name: 'Schema', score: 3 }], scoreBreakdown: { entity: 70, density: 60, clarity: 80, structure: 75 } };
    const md = buildCover(buildScoreCover(r, 'https://acme.com', 'Acme', 'October 15, 2026', null)).join('\n');
    expect(md).toContain('**72/100**');
    expect(md).toContain(`**${SPLIT.notYet}**`);
    expect(md).toContain(SPLIT.runSweep);
    const md2 = buildCover(buildScoreCover(r, 'https://acme.com', 'Acme', 'October 15, 2026', { cited: 0, n: 200, engines: 4, at: '2026-10-13T12:00:00Z' })).join('\n');
    expect(md2).toContain('**0%**');
    expect(md2).toContain('0 of 200 category answers, four engines, October 13th');
  });
  it('the bridging sentence appears at score 86+ and rate under 10%, and not otherwise (equal edges tested)', () => {
    const sp = (score: number | null, pct: number | null) => ({ readiness: { score }, recommended: { pct, line: '' } });
    expect(splitBridge(sp(86, 9))).toBe(SPLIT.bridge);
    expect(splitBridge(sp(85, 0))).toBeNull();
    expect(splitBridge(sp(90, 10))).toBeNull();
    expect(splitBridge(sp(null, 0))).toBeNull();
    expect(splitBridge(sp(95, null))).toBeNull();
  });
  it('recommendedLine pluralises and ordinals correctly', () => {
    expect(recommendedLine(3, 40, 5, '2026-10-01T00:00:00Z')).toBe('3 of 40 category answers, five engines, October 1st');
    expect(recommendedLine(0, 8, 1, '2026-10-22T00:00:00Z')).toBe('0 of 8 category answers, one engine, October 22nd');
    expect(recommendedLine(0, 8, 2, '2026-10-11T00:00:00Z')).toContain('October 11th');
  });
  it('no composite, grade or tier is introduced on the split', () => {
    const md = buildCover(buildSweepCover({ ...base, readiness: { score: 90 } })).join('\n');
    const split = md.slice(md.indexOf('<!-- cover:split -->'), md.indexOf(SPLIT.nextTitle));
    expect(split).not.toMatch(/composite|grade|overall|combined|tier/i);
  });
  it('the Word export carries the split as real text', async () => {
    const md = buildSweepReport({ ...base, readiness: { score: 90 } });
    const { default: JSZip } = await import('jszip');
    const xml = await (await JSZip.loadAsync(await Packer.toBuffer(await buildSweepDocument(md, 'aeoanalyzers.com')))).file('word/document.xml')!.async('string');
    const text = xml.replace(/<[^>]+>/g, '');
    expect(text).toContain('Ready to be cited');
    expect(text).toContain('Recommended by engines');
    expect(text).toContain('90/100');
    expect(text).toContain('What to do next: How AI engines choose who to recommend, and what you can do about it: https://aeoanalyzers.com/get-recommended');
    expect(text).not.toContain('](https://aeoanalyzers.com/get-recommended)');
  });
});

describe('B — Source coverage', () => {
  it('excludes own domain, engine hosts and grounding redirects; recurring = 2+ answers; caps per host and per sweep', () => {
    const many = Array.from({ length: 60 }, (_, i) => `https://site${i}.com/a`);
    const rs = [
      run({ sources: ['https://aeoanalyzers.com/x', 'https://chatgpt.com/x', 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc', 'https://g2.com/1', 'https://g2.com/2', 'https://g2.com/3', 'https://g2.com/4', 'https://once.com/a', ...many] }),
      run({ runIndex: 1, sources: ['https://g2.com/1', 'https://g2.com/2', 'https://g2.com/3', 'https://g2.com/4', ...many] }),
      run({ runIndex: 2, queryType: 'branded', sources: ['https://branded-only.com/a', 'https://branded-only.com/b'] }),
    ];
    const p = planSourceCoverage(rs, 'aeoanalyzers.com');
    const hosts = p.recurring.map((h) => h.host);
    expect(hosts).toContain('g2.com');
    expect(hosts).not.toContain('aeoanalyzers.com');
    expect(hosts).not.toContain('chatgpt.com');
    expect(hosts).not.toContain('once.com');
    expect(hosts).not.toContain('branded-only.com');
    expect(hosts.some((h) => h.includes('vertexaisearch'))).toBe(false);
    expect(p.recurring.find((h) => h.host === 'g2.com')!.urls.length).toBe(MAX_URLS_PER_HOST);
    expect(p.pages.length).toBe(MAX_URLS_PER_SWEEP);
    expect(p.distinctSites).toBe(1 + 1 + 60); // g2, once, site0..59
  });
  it('names you on the brand, its no-space form or the bare domain — never a generic fragment', () => {
    const m = brandMatchers('AEO Analyzers', 'aeoanalyzers.com');
    expect(namesYou('Tools like AEO Analyzers measure this', m)).toBe(true);
    expect(namesYou('AEOAnalyzers is one option', m)).toBe(true);
    expect(namesYou('see aeoanalyzers.com/pricing', m)).toBe(true);
    expect(namesYou('The best AEO tools, analyzers and dashboards', m)).toBe(false);
    expect(namesYou('AEO is changing search', m)).toBe(false);
    expect(namesYou('notaeoanalyzers.com', m)).toBe(false);
  });
  it('headline, D line, and the Outreach action lists only the No rows', () => {
    const hl = coverageHeadline(coverage);
    expect(hl.headline).toBe('You are named on 1 of 3 recurring pages engines read for your category questions (fetched October 15, 2026; 1 could not be read).');
    expect(hl.sites).toBe('Engines cited 31 distinct sites across your category answers.');
    const a = coverageAction(coverage)!;
    expect(a.title).toBe('Pages engines read that do not name you yet');
    expect(a.items).toHaveLength(1);
    expect(a.items[0]).toContain('g2.com');
  });
  it('a page that could not be read is never counted as "No"', () => {
    const md = buildSweepReport({ ...base, sourceCoverage: coverage });
    expect(md).toContain('| reddit.com | 4 | Perplexity | https://www.reddit.com/r/SEO/x | Could not read (robots) | 2026-10-15 |');
    expect(md).not.toMatch(/reddit\.com[^\n]*\| No \|/);
  });
  it('robots: the group for our agent wins over *, longest rule wins, Allow wins a tie', () => {
    const r = robotsRules('User-agent: *\nDisallow: /\n\nUser-agent: AEOAnalyzersBot\nDisallow: /private\nAllow: /private/ok');
    expect(robotsAllows(r, '/blog')).toBe(true);
    expect(robotsAllows(r, '/private/x')).toBe(false);
    expect(robotsAllows(r, '/private/ok/1')).toBe(true);
    expect(robotsAllows(robotsRules('User-agent: *\nDisallow: /docs\nAllow: /docs'), '/docs/a')).toBe(true); // a tie: Allow wins
    const star = robotsRules('User-agent: *\nDisallow: /');
    expect(robotsAllows(star, '/anything')).toBe(false);
  });
  it('B10 corroboration and B11 vendor base, with the headline denominator untouched', () => {
    const cor = corroboration(runs, 'aeoanalyzers.com');
    expect(corroborationLine(cor)).toMatch(/^When asked about you by name, engines cited \d+ sources?; \d+ (was|were) not your own site\.$/);
    expect(cor.hosts).not.toContain('aeoanalyzers.com');
    const vb = vendorBase(runs, client, comps);
    const total = vb.perSegment.reduce((a, r) => a + r.answers, 0);
    expect(total).toBe(vb.perQuestion.reduce((a, r) => a + r.answers, 0));
    for (const r of vb.perQuestion) { expect(r.namedVendor).toBeGreaterThanOrEqual(r.recommendedYou); expect(vendorBaseLine(r)).toMatch(/^\d+ of \d+ recommended you; \d+ of \d+ named at least one vendor\.$/); }
  });
  it('no fetch counts or cost reach the customer report', () => {
    const full = buildSweepReport({ ...base, sourceCoverage: coverage });
    // Engines' own quoted claims (belief table, appendix) may carry prices; our Source coverage
    // wording and its action may not, and neither may carry a fetch count.
    const md = full.slice(full.indexOf('## Source coverage'), full.indexOf('## Action plan')) + full.slice(full.indexOf('Pages engines read that do not name you yet'), full.indexOf('## Methodology'));
    expect(md).not.toMatch(/\$\d|fetch(es|ed)? count|pages fetched|\d+ fetches/i);
  });
});

describe('C — one owner tag per action, grouped Site → Content → Outreach', () => {
  it('the sweep report groups by owner in order and every action has one tag and one next-sweep line', () => {
    const md = buildSweepReport({ ...base, sourceCoverage: coverage });
    const plan = md.slice(md.indexOf('## Action plan'), md.indexOf('## Methodology'));
    const idx = OWNER_ORDER.map((o) => plan.indexOf(`### ${o} —`)).filter((i) => i >= 0);
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
    const tags = plan.match(/_\(Owner: (Site|Content|Outreach)\)_/g) || [];
    const lines = plan.match(/What the next sweep shows:/g) || [];
    expect(tags.length).toBeGreaterThan(0);
    expect(lines.length).toBe(tags.length);
    expect(plan).toContain('Pages engines read that do not name you yet** _(Owner: Outreach)_');
    expect(plan).not.toMatch(/\bimprove/i);
  });
  it('checklist items map to exactly one owner', () => {
    expect(ownerForChecklist('Schema', 'Add Organization JSON-LD')).toBe('Site');
    expect(ownerForChecklist('Content', 'Rewrite the intro answer-first')).toBe('Content');
    expect(ownerForChecklist('Authority', 'Claim your G2 listing')).toBe('Outreach');
    const g = groupChecklist([{ category: 'Authority', action: 'Claim your G2 listing' }, { category: 'Schema', action: 'Add JSON-LD' }]);
    expect(g.map((x) => x.owner)).toEqual(['Site', 'Outreach']);
  });
  it('the next-sweep line names a figure and promises nothing', () => {
    for (const f of ['discovery', 'accuracy', 'citation', 'coverage', 'readiness'] as const) expect(nextSweepLine(f)).not.toMatch(CAUSAL_WORDS);
  });
});

describe('G — the Record', () => {
  const entries: RecordEntry[] = [
    { domain: 'aeoanalyzers.com', title: 'Five-engine post published', owner_tag: 'Content', source: 'own', done_at: '2026-10-15', link: 'https://aeoanalyzers.com/blog/the-fifth-engine' },
    { domain: 'aeoanalyzers.com', title: 'Measurement Layer post published', owner_tag: 'Content', source: 'own', done_at: '2026-10-14' },
    { domain: 'aeoanalyzers.com', title: 'Before the window', owner_tag: 'Site', source: 'own', done_at: '2026-10-13' },
  ];
  const fig = (date: string, panel: string, engines: string[], cited: number): SweepFigures => ({ date, panel, engines, foundByName: { cited: 30, n: 40 }, recommended: { cited, n: 200 }, coverage: { yes: 1, n: 12 }, corroboration: { thirdParty: 5, sources: 9 } });
  it('the window is after the previous sweep day, through this sweep day', () => {
    expect(entriesBetween(entries, '2026-10-13T09:00:00Z', '2026-10-25T09:00:00Z').map((e) => e.done_at)).toEqual(['2026-10-14', '2026-10-15']);
  });
  it('same panel: dates first, then previous → now with denominators, and no causal wording', () => {
    const md = measuredAfter(entries, fig('2026-10-13T09:00:00Z', 'v1.2', ['claude', 'gemini'], 0), fig('2026-10-25T09:00:00Z', 'v1.2', ['claude', 'gemini'], 2)).join('\n');
    expect(md.startsWith(`**${MEASURED_AFTER}**`)).toBe(true);
    expect(md).toContain('October 14, 2026: Measurement Layer post published (Content)');
    expect(md).toContain('| Recommended on category questions | 0 of 200 answers | 2 of 200 answers |');
    expect(md).toContain('named on 1 of 12 recurring pages');
    expect(md).toContain('5 of 9 sources not your own site');
    expect(md).not.toMatch(CAUSAL_WORDS);
  });
  it('different panel: both sets, the line, and no change computed', () => {
    const md = measuredAfter(entries, fig('2026-10-13T09:00:00Z', 'v1.1', ['claude'], 0), fig('2026-10-25T09:00:00Z', 'v1.2', ['claude', 'grok'], 2)).join('\n');
    expect(md).toContain(PANEL_DIFFERS);
    expect(md).not.toContain('| 0 of 200 answers | 2 of 200 answers |');
  });
  it('nothing done in the window → no block', () => {
    expect(measuredAfter(entries, fig('2026-10-20T00:00:00Z', 'v1.2', ['claude'], 0), fig('2026-10-25T00:00:00Z', 'v1.2', ['claude'], 0))).toEqual([]);
  });
  it('CSV is oldest first, quoted, and neutralizes formulas', () => {
    const csv = recordCsv([...entries, { domain: 'x.com', title: '=HYPERLINK("evil")', owner_tag: 'Site', source: 'own', done_at: '2026-10-16' }]);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe('"Date done","Action","Owner","Source","Note","Link","Domain"');
    expect(lines[1]).toContain('"2026-10-13"');
    expect(lines[4]).toContain(`"'=HYPERLINK(""evil"")"`);
  });
  it('the Word handoff carries the Record oldest first, and the actions are markable', () => {
    const md = buildSweepReport({ ...base, sourceCoverage: coverage, record: { entries, previous: null, now: null } });
    const sec = md.slice(md.indexOf('## The Record'));
    expect(sec.indexOf('2026-10-13')).toBeLessThan(sec.indexOf('2026-10-15'));
    expect(recordSection([])).toEqual([]);
    const acts = recordActions({ ...base, sourceCoverage: coverage });
    expect(acts.some((a) => a.key === 'coverage:no-pages' && a.owner === 'Outreach')).toBe(true);
    expect(new Set(acts.map((a) => a.key)).size).toBe(acts.length);
  });
});

describe('screen — the same split and the Record panel render', () => {
  it('CoverCard shows both figures, the bridge and the link; RecordPanel gates by tier', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { CoverCard } = await import('../components/CoverCard');
    const { RecordPanel } = await import('../components/RecordPanel');
    const html = renderToStaticMarkup(React.createElement(CoverCard, { cover: buildSweepCover({ ...base, readiness: { score: 90 } }) }));
    expect(html).toContain('Ready to be cited');
    expect(html).toContain('90/100');
    expect(html).toMatch(/category answers, four engines, October 13th/);
    expect(html).toContain(SPLIT.bridge);
    expect(html).toContain('href="https://aeoanalyzers.com/get-recommended"');
    const gated = renderToStaticMarkup(React.createElement(RecordPanel, { domain: 'acme.com', enabled: false, actions: [] }));
    expect(gated).toContain('The Record is included on Pro and Business.');
    expect(gated).not.toMatch(/\$\d/);
    const open = renderToStaticMarkup(React.createElement(RecordPanel, { domain: 'acme.com', enabled: true, actions: [{ key: 'k', title: 'Claim your G2 listing', owner: 'Outreach' }] }));
    expect(open).toContain('Mark done');
    expect(open).toContain('Add your own');
    expect(open).toContain('Outreach');
  });
});
