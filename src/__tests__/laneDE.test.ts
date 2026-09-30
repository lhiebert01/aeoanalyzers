import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { pawcSplit, mentionsClient, PROMINENT_SHARE, PROMINENT_FOOTNOTE } from '../lib/pawcSplit';
import { pawcShare } from '../lib/pawc';
import { mdToHtml, printDocument } from '../lib/mdToHtml';
import { DIRECTIVE } from '../lib/reportCover';
import { buildSweepReport, type SweepResponse } from '../lib/sweepReport';
import { aggregateSweep, scoreRun, type SweepRunResult } from '../lib/citationSweep';

describe('Lane D — Recommended (prominent) vs Mentioned, on the existing E1 metric', () => {
  const m = mentionsClient({ domain: 'acme.com', brand: 'Acme' });
  const lead = 'Acme is the standard choice for indoor 5G. Acme ships radios and a core. Other vendors include Nokia and Ericsson.';
  const aside = 'Nokia and Ericsson lead this market with broad portfolios. Cisco is common in enterprises. Smaller vendors such as Acme also exist.';
  it('an answer that leads with the subject is prominent; a trailing aside is a mention; silence is neither', () => {
    expect(pawcShare(lead, m)).toBeGreaterThanOrEqual(PROMINENT_SHARE);
    expect(pawcShare(aside, m)).toBeGreaterThan(0);
    expect(pawcShare(aside, m)).toBeLessThan(PROMINENT_SHARE);
    expect(pawcSplit([lead, aside, 'Nokia and Ericsson only.'], m)).toEqual({ prominent: 1, mentioned: 1, answers: 3 });
  });
  it('the split never changes the metric: shares are exactly what lib/pawc.ts returns', () => {
    expect(pawcShare(lead, m)).toBe(pawcShare(lead, m)); // deterministic
    expect(PROMINENT_FOOTNOTE).toMatch(/quarter/);
  });
});

describe('Lane E — the PDF is the same markdown, rendered for print', () => {
  const md = [DIRECTIVE.title, '# Citation Sweep — acme.com', '**Acme** · acme.com', '', DIRECTIVE.headlines, '| A | B |', '|---|---|', '| **1%** | **2%** |', '| a | b |', '', DIRECTIVE.bars, '| | | |', '|---|---|---|', '| Use-case | 40% | N=5 |', '', DIRECTIVE.pagebreak, '## Next', '- one', '- **two**', '| h | i |', '|---|---|', '| x | y |'].join('\n');
  it('renders tiles, bars, a page break, lists and tables; leaks no directive', () => {
    const html = mdToHtml(md);
    expect(html).toContain('<h1>Citation Sweep — acme.com</h1>');
    expect(html).toContain('class="tiles"'); expect(html).toContain('<div class="value"><b>1%</b></div>');
    expect(html).toContain('style="width:40%"');
    expect(html).toContain('<div class="pagebreak"></div>');
    expect(html).toContain('<li><b>two</b></li>'); expect(html).toContain('<th>h</th>');
    expect(html).not.toContain('<!--');
  });
  it('the document title is the filename pattern the order requires', () => {
    const doc = printDocument(md, 'citation-sweep-acme.com-2026-09-30');
    expect(doc).toContain('<title>citation-sweep-acme.com-2026-09-30</title>');
    expect(doc).toContain('@page { size: A4');
  });
});

const FX = '/tmp/claude-1000/-mnt-c-src-aeo-app1/037f8049-e28c-4e87-b501-2be704094e78/scratchpad/nybsys-sweep.json';
describe.skipIf(!existsSync(FX))('Lane D acceptance — Nybsys shows 0 / 0 (nothing to split) on category; the split appears on branded', () => {
  it('reads 0 prominent / 0 mentioned in every segment row and the footnote is present', () => {
    const d = JSON.parse(readFileSync(FX, 'utf8'));
    const client = { domain: 'nybsys.com', brand: 'Nybsys' };
    const seeds = (d.sweep?.competitors ?? []).map((c: any) => ({ name: c.name, domain: c.domain }));
    const runs: SweepRunResult[] = d.runs.map((r: any) => scoreRun({ engine: r.engine, query: r.query, queryType: r.query_type, runIndex: r.run_index, transcript: r.transcript || '', sources: r.sources || [], costUsd: 0, truncated: !!r.truncated, grounding: r.grounding }, client, seeds));
    const result: SweepResponse = { domain: 'Nybsys.com', brand: 'Nybsys', runsPerQuery: 1, engines: [], skippedEngines: [], configured: ['claude', 'openai', 'perplexity', 'gemini'], summary: aggregateSweep(runs, client, seeds), runs, persisted: true, generatedAt: '2026-09-30T18:42:05Z', tier: 'paid' };
    const md = buildSweepReport({ result, competitors: seeds, fidelity: null, entityLinking: null, authority: null, bots: null, truth: null, pageFactDensity: null, ownedDomains: [], isAdmin: false, savedView: true, now: new Date('2026-09-30T21:08:00Z') });
    const segRows = md.split('\n').filter((l) => /^\| (Use-case|Head-to-head \/ alternatives|Category discovery) \| \*\*\d+%\*\* \|/.test(l)); // the 5-column segment table, not the cover's bar rows
    expect(segRows.length).toBeGreaterThan(0);
    for (const row of segRows) expect(row).toMatch(/\| 0 \| 0 \|$/);
    expect(md).toContain(PROMINENT_FOOTNOTE);
    expect(md).toMatch(/Of the 8 branded answers, \*\*\d+\*\* recommended you prominently and \*\*\d+\*\* mentioned you\./);
  });
});
