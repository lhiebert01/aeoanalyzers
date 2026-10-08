import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Packer } from 'docx';
import { scoreRun, aggregateSweep, type SweepRunResult } from '../lib/citationSweep';
import { buildSweepReport } from '../lib/sweepReport';
import { buildSweepDocument } from '../services/sweepDocx';
import { mdToHtml } from '../lib/mdToHtml';
import { assembleReportData, renderExecReport, defaultNarrative } from '../lib/execReport';
import { findLeaks, sanitizeCustomerExport, stripCost } from '../lib/customerSafe';

/** WO-AEO-BRANDED-ACCURACY-004 Part B — every customer export, built from a REAL stored sweep with real
 *  cost figures in it, built AS ADMIN on purpose, carries no cost and nothing internal. Part of the gate. */
const d = JSON.parse(readFileSync('docs/baselines/aeoanalyzers-2026-09-01.json', 'utf8'));
const client = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers' };
const comps = [{ name: 'Profound', domain: 'tryprofound.com' }, { name: 'Otterly AI', domain: 'otterly.ai' }, { name: 'Peec AI', domain: 'peec.ai' }];
// Committed baselines no longer carry cost (WO-004), so cost is injected at a realistic per-call rate
// to prove the builders strip what they are handed.
const runs: SweepRunResult[] = d.runs.map((r: any) => scoreRun({ ...r, costUsd: 0.0113 }, client, comps));
const realCost = runs.reduce((a, r) => a + (r.costUsd || 0), 0);
const result: any = { domain: 'aeoanalyzers.com', brand: 'AEO Analyzers', runsPerQuery: 5, engines: ['claude', 'openai', 'perplexity', 'gemini'], skippedEngines: [], configured: ['claude', 'openai', 'perplexity', 'gemini'], summary: aggregateSweep(runs, client, comps), runs, persisted: true, generatedAt: '2026-09-03T03:49:52Z', tier: 'paid' };
const OTHER = { otherCustomerDomains: ['example-other-customer.com', 'lanternpost.app'] };
const textOfDocx = async (md: string) => {
  const { default: JSZip } = await import('jszip');
  const xml = await (await JSZip.loadAsync(await Packer.toBuffer(await buildSweepDocument(md, 'aeoanalyzers.com')))).file('word/document.xml')!.async('string');
  return xml.replace(/<w:p[ >]/g, '\n<w:p ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
};
const textOfHtml = (html: string) => html.replace(/<(?:p|h\d|li|tr|div)[ >]/g, '\n$&').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

describe('Part B — customer exports are safe by construction', () => {
  it('the fixture really carries cost, so the test is not vacuous', () => {
    expect(realCost).toBeGreaterThan(1);
  });
  const md = buildSweepReport({ result, competitors: comps, fidelity: null, entityLinking: null, authority: null, bots: null, truth: null, pageFactDensity: null, ownedDomains: [], isAdmin: true, savedView: true, now: new Date('2026-10-08T00:00:00Z') });
  it('Markdown, built as admin: no leak of any class', () => {
    expect(findLeaks(md, OTHER)).toEqual([]);
  });
  it('Word, text-extracted: no leak of any class', async () => {
    expect(findLeaks(await textOfDocx(md), OTHER)).toEqual([]);
  });
  it('PDF (the print document the PDF is rendered from), text-extracted: no leak of any class', () => {
    expect(findLeaks(textOfHtml(mdToHtml(md)), OTHER)).toEqual([]);
  });
  it('Executive report, built from runs that carry cost: no leak and no cost field', () => {
    const data = assembleReportData({ brand: 'AEO Analyzers', domain: 'aeoanalyzers.com', sweepDate: '2026-09-03', runs, competitors: comps, truth: d.truthForAccuracy });
    expect(JSON.stringify(data)).not.toMatch(/"costUsd":\s*[1-9]|"totalCostUsd":\s*[1-9]/);
    const rep = renderExecReport(data, defaultNarrative(data), 'courtesy' as any);
    expect(findLeaks(rep, OTHER)).toEqual([]);
  });
  it('the builders never receive cost: stripCost zeroes every figure', () => {
    const s = stripCost(result);
    expect(s.runs.every((r: any) => r.costUsd === 0)).toBe(true);
    expect(s.summary.totalCostUsd).toBe(0);
    expect(s.summary.engines.every((e: any) => e.costUsd === 0)).toBe(true);
    expect(result.summary.totalCostUsd).toBeGreaterThan(1); // input untouched
  });
});

describe('the sanitizer catches every leak class (PROVE BY BREAKING)', () => {
  const leaks = [
    ['currency-figure', 'Total sweep cost: ~$2.700'],
    ['cost-term', 'This sweep cost 270 credits'],
    ['token-count', 'Used 41,200 input tokens'],
    ['internal-path', 'Transcripts: private/baselines/rerun-2026-10-08/S4.json'],
    ['commit-id', 'Built from commit a1ae075'],
    ['admin-marker', 'Admin-only: COST_SCALE applied'],
    ['other-customer', 'Compare with example-other-customer.com'],
  ] as const;
  for (const [cls, line] of leaks) {
    it(`${cls} in the report's own text is removed and reported`, () => {
      const r = sanitizeCustomerExport(`# Report\n${line}\nClean line.`, OTHER);
      expect(r.removed.map((x) => x.cls)).toContain(cls);
      expect(r.text).not.toContain(line);
      expect(r.text).toContain('Clean line.');
    });
  }
  it('an engine quoting a price in the verbatim appendix is evidence, not a leak; a path there is still a leak', () => {
    const txt = '# R\n## Appendix — transcripts (2 runs)\nBigin starts at $9/month, a lower cost alternative.\nsee private/baselines/x.json';
    const found = findLeaks(txt, OTHER).map((l) => l.cls);
    expect(found).toEqual(['internal-path']);
  });
  it('ordinary words are not leaks: "the gap that costs sales", "lower cost alternative to X"', () => {
    expect(findLeaks('The gap that costs sales: on category questions.\nWrite the page that answers: "lower cost alternative to Ericsson"')).toEqual([]);
  });
});
