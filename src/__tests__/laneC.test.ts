import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { Packer } from 'docx';
import { buildCover, sweepMeaning, scoreMeaning, sentenceCount, DIRECTIVE } from '../lib/reportCover';
import { buildSweepReport, buildSweepCover, type SweepResponse } from '../lib/sweepReport';
import { buildSweepDocument } from '../services/sweepDocx';
import { sweepScorecard, aggregateSweep, scoreRun, type SweepRunResult } from '../lib/citationSweep';

/** WO-AEO-REPORT-POLISH-001 Lane C — page 1 is the argument; the rest is evidence. */

async function docxText(md: string): Promise<{ text: string; xml: string; buf: Buffer }> {
  const doc = await buildSweepDocument(md, 'example.com');
  const buf = await Packer.toBuffer(doc);
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml')!.async('string');
  const text = xml.replace(/<w:p[ >]/g, '\n<w:p ').replace(/<w:tc[ >]/g, ' | <w:tc ').replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ');
  return { text, xml, buf };
}

describe('the "what this means" paragraph is a template with the numbers injected — never a model', () => {
  const base = { brand: 'Acme', brandedPct: 100, brandedN: 8, categoryPct: 0, categoryN: 28, ownedPct: 100, topNamed: { name: 'Ericsson', count: 14 }, modelPriorRuns: 11, drifted: 0, collisions: [] as string[] };
  it('branded high / category zero reads as a recommendation gap, 3–5 sentences, every number from the input', () => {
    const m = sweepMeaning(base);
    expect(sentenceCount(m)).toBeGreaterThanOrEqual(3); expect(sentenceCount(m)).toBeLessThanOrEqual(5);
    expect(m).toMatch(/recommendation gap, not a discovery gap/);
    expect(m).toContain('100% of 8'); expect(m).toContain('none of the 28'); expect(m).toContain('Ericsson was named most often (14 answers)');
    expect(m).toContain('None of the answers that named you got a fact wrong.');
    for (const n of m.match(/\d+/g) || []) expect([100, 8, 28, 14, 11].map(String)).toContain(n);
  });
  it('branded low reads as discovery first; category > 0 names the best segment; collisions and drift each get their sentence', () => {
    expect(sweepMeaning({ ...base, brandedPct: 25, brandedN: 8 })).toMatch(/Discovery comes first/);
    expect(sweepMeaning({ ...base, categoryPct: 20, bestSegment: { label: 'Use-case', winPct: 33, n: 12 } })).toMatch(/converts best on Use-case questions \(33% of 12\)/);
    expect(sweepMeaning({ ...base, collisions: ['acme-mwc.com'] })).toMatch(/confused you with acme-mwc\.com/);
    expect(sweepMeaning({ ...base, drifted: 2 })).toMatch(/2 of the answers that named you got a fact wrong/);
    expect(sweepMeaning({ ...base, drifted: undefined })).not.toMatch(/fact wrong/);
    expect(sweepMeaning({ ...base, brandedPct: null, categoryPct: null })).toMatch(/makes no diagnosis/);
  });
  it('score: names the dragging dimension and the class of fix; the crawler cap leads when present', () => {
    const m = scoreMeaning({ score: 61, citationProbability: 58, breakdown: { entity: 75, density: 45, clarity: 60, structure: 65 } });
    expect(m).toMatch(/61\/100, in the Okay \/ Fair range/);
    expect(m).toMatch(/factual density at 45\/100, which calls for verifiable facts/);
    expect(m).toMatch(/Entity identity and schema is the strongest at 75\/100/);
    expect(m).toMatch(/not a measured citation rate/);
    expect(scoreMeaning({ score: 40, citationProbability: 20, crawlerCriticalBlock: true })).toMatch(/^A citation-critical AI crawler is blocked/);
    expect(sentenceCount(m)).toBeLessThanOrEqual(5);
  });
});

describe('the cover renders as markdown with directives a markdown viewer ignores', () => {
  const cover = buildCover({
    title: 'Citation Sweep — acme.com', brand: 'Acme', domain: 'acme.com', date: 'September 30, 2026', preparedBy: 'Jane Roe',
    headlines: [{ plain: 'Found when asked by name', precise: 'Branded retrievability', value: '100%', note: 'N=8 · high confidence' }, { plain: 'Recommended to new buyers', precise: 'Category citation win', value: '0%' }],
    barsTitle: 'By segment', bars: [{ label: 'Use-case', pct: 0, detail: 'N=12' }, { label: 'Enterprise', pct: null, detail: 'N=0' }],
    namedInstead: [{ name: 'Ericsson', count: 14, seeded: true }, { name: 'Nokia', count: 12 }],
    meaning: 'One. Two. Three.', firstThree: [{ what: 'Do X', section: 'Action plan' }], pointer: 'See the appendix.',
  }).join('\n');
  it('carries every element in order', () => {
    const idx = (s: string) => cover.indexOf(s);
    expect(idx(DIRECTIVE.title)).toBeLessThan(idx('# Citation Sweep — acme.com'));
    expect(idx('**Acme** · acme.com · September 30, 2026 · Prepared by Jane Roe')).toBeGreaterThan(0);
    expect(idx(DIRECTIVE.headlines)).toBeLessThan(idx('| Found when asked by name | Recommended to new buyers |'));
    expect(idx('| **100%** | **0%** |')).toBeLessThan(idx('| Branded retrievability | Category citation win |'));
    expect(idx(DIRECTIVE.bars)).toBeLessThan(idx('| Use-case | 0% | N=12 |'));
    expect(cover).toContain('| Enterprise | Unmeasured | N=0 |');
    expect(cover).toContain('| Ericsson (entered by you) | 14 |');
    expect(idx('### What this means')).toBeLessThan(idx('### Do these three things first'));
    expect(cover).toContain('1. **Do X** — see “Action plan”.');
  });
  it('the docx renders headline tiles, a shaded bar block and a page break — cell shading only, no chart', async () => {
    const { text, xml } = await docxText(cover + '\n' + DIRECTIVE.pagebreak + '\n## Next\nBody.');
    expect(text).toContain('100%'); expect(text).toContain('Branded retrievability');
    expect(xml).toContain('w:type="page"');                       // the page break
    expect((xml.match(/w:fill="15803D"/g) || []).length).toBe(0 + 0); // Use-case 0% → no filled segment
    expect((xml.match(/w:fill="E4E4E7"/g) || []).length).toBe(40);   // two bars × 20 empty segments
    expect(xml).not.toContain('<!--');                             // directives never leak
  });
  it('PROVE BY BREAKING: a 65% bar fills 13 of 20 segments', async () => {
    const md = `${DIRECTIVE.bars}\n| a | b | c |\n|---|---|---|\n| Entity | 65% | 30% of score |\n`;
    const { xml } = await docxText(md);
    expect((xml.match(/w:fill="15803D"/g) || []).length).toBe(13);
    expect((xml.match(/w:fill="E4E4E7"/g) || []).length).toBe(7);
  });
});

/** Acceptance: regenerate the founder's Nybsys 2026-09-30 sweep report from the stored runs. */
const FX = '/tmp/claude-1000/-mnt-c-src-aeo-app1/037f8049-e28c-4e87-b501-2be704094e78/scratchpad/nybsys-sweep.json';
const OUT = '/tmp/claude-1000/-mnt-c-src-aeo-app1/037f8049-e28c-4e87-b501-2be704094e78/scratchpad/laneC';
describe.skipIf(!existsSync(FX))('Lane C acceptance — Nybsys 2026-09-30', () => {
  const d = JSON.parse(readFileSync(FX, 'utf8'));
  const client = { domain: 'nybsys.com', brand: 'Nybsys' };
  const seeds = (d.sweep?.competitors ?? []).map((c: any) => ({ name: c.name, domain: c.domain }));
  const raw: SweepRunResult[] = d.runs.map((r: any) => ({
    engine: r.engine, query: r.query, queryType: r.query_type, runIndex: r.run_index,
    transcript: r.transcript || '', sources: r.sources || [], costUsd: 0, truncated: !!r.truncated, grounding: r.grounding,
  }));
  const runs = raw.map((r) => scoreRun(r, client, seeds));
  const result: SweepResponse = {
    domain: 'Nybsys.com', brand: 'Nybsys', runsPerQuery: 1, engines: ['claude', 'openai', 'perplexity', 'gemini'], skippedEngines: [], configured: ['claude', 'openai', 'perplexity', 'gemini'],
    summary: aggregateSweep(runs, client, seeds), runs, persisted: true, generatedAt: '2026-09-30T18:42:05Z', tier: 'paid',
  };
  const inputs = { result, competitors: seeds, fidelity: { citedAccurate: 8, citedDrifted: 0, issues: [] } as any, entityLinking: null, authority: null, bots: null, truth: null, pageFactDensity: null, ownedDomains: ['nybsys-mwc.com'], isAdmin: false, savedView: true, now: new Date('2026-09-30T21:08:00Z') };

  it('page 1 states the diagnosis and the first three actions without reading further', async () => {
    const cover = buildSweepCover(inputs);
    expect(cover.headlines.map((h) => h.value)).toEqual(['100%', '0%', '100%']);
    expect(cover.namedInstead?.slice(0, 3).map((n) => `${n.name} ${n.count}`)).toEqual(['Ericsson 14', 'Nokia 12', 'Celona 11']);
    expect(cover.meaning).toMatch(/recommendation gap, not a discovery gap/);
    expect(cover.firstThree).toHaveLength(3);
    const md = buildSweepReport(inputs);
    const page1 = md.split(DIRECTIVE.pagebreak)[0];
    expect(page1.split('\n').filter((l) => l.trim()).length).toBeLessThanOrEqual(40); // one printed page
    // section order after the cover follows the reader's question
    const order = ['## What AI believes about you', '## Where you win and lose', '## Who got named instead', '## Action plan', '## Methodology', '## Appendix — transcripts (48 runs)'];
    let last = -1; for (const h of order) { const i = md.indexOf('\n' + h); expect(i, h).toBeGreaterThan(last); last = i; }
    expect(md).not.toMatch(/Pick Rate/i);
    // Lane F: plain label first, precise second
    expect(md).toContain('**Found when asked by name** — branded retrievability');
    expect(md).toContain('Answered from memory (no search)');
    const { text, buf } = await docxText(md);
    expect(text).toContain('Citation Sweep — Nybsys.com');
    expect(text).toContain('Ericsson');
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/citation-sweep-Nybsys.com-2026-09-30.md`, md);
    writeFileSync(`${OUT}/citation-sweep-Nybsys.com-2026-09-30.docx`, buf);
  });
});
