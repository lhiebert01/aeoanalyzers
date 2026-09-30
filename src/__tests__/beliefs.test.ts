import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { extractBeliefs, beliefsMarkdown, flaggedWrongValues } from '../lib/beliefs';

/** WO-AEO-REPORT-POLISH-001 Lane B — the claims table reports agreement, never truth. */
const run = (engine: string, transcript: string, extra: Record<string, unknown> = {}) => ({ engine, queryType: 'branded', transcript, ...extra });

describe('Lane B — what the engines believe about you', () => {
  it('one place said three ways is ONE consistent row', () => {
    const rows = extractBeliefs([
      run('claude', 'Acme is a supplier based in San Jose, California. It sells widgets.'),
      run('gemini', 'Acme is headquartered in Silicon Valley (San Jose, California).'),
      run('perplexity', 'Acme is a San Jose-based maker of widgets.'),
    ], 'Acme');
    const hq = rows.filter((r) => r.field === 'Headquarters');
    expect(hq).toHaveLength(1);
    expect(hq[0]).toMatchObject({ claim: 'San Jose, California', times: 3, status: 'Consistent' });
    expect(hq[0].saidBy).toEqual(['claude', 'perplexity', 'gemini']);
  });
  it('the capture stops at the sentence — never "San Jose, California. The"', () => {
    const rows = extractBeliefs([run('claude', 'Based in San Jose, California. The company delivers hardware.')], 'Acme');
    expect(rows.find((r) => r.field === 'Headquarters')?.claim).toBe('San Jose, California');
  });
  it('two different values for a one-valued fact are BOTH marked Conflicts', () => {
    const rows = extractBeliefs([run('openai', 'Founded in 2006, Acme is global.'), run('gemini', 'Acme was established in 2010.')], 'Acme');
    expect(rows.filter((r) => r.field === 'Founded').map((r) => [r.claim, r.status])).toEqual([['2006', 'Conflicts'], ['2010', 'Conflicts']]);
  });
  it('one engine alone is Single-source, even said twice', () => {
    const rows = extractBeliefs([run('openai', 'Founded in 2006.'), run('openai', 'It was founded in 2006.')], 'Acme');
    expect(rows.find((r) => r.field === 'Founded')).toMatchObject({ times: 2, status: 'Single-source' });
  });
  it('"Contradicts your site" appears ONLY for a value the fidelity classifier flagged', () => {
    const runs = [run('perplexity', 'Its site lists **Jane Roe** as founder and CEO.'), run('claude', 'It is led by CEO and founder Jane Roe.')];
    expect(extractBeliefs(runs, 'Acme').find((r) => r.field === 'Founder / CEO')?.status).toBe('Consistent');
    const flagged = flaggedWrongValues({ issues: [{ type: 'hallucinated_founder', wrong: 'Jane Roe' }] });
    expect(extractBeliefs(runs, 'Acme', flagged).find((r) => r.field === 'Founder / CEO')?.status).toBe('Contradicts your site');
    // an omitted-founder issue names no wrong value — it must not flag anything
    expect(flaggedWrongValues({ issues: [{ type: 'omitted_founder' }] })).toEqual([]);
  });
  it('product lines merge singular/plural/hyphen variants and drop sentence fragments', () => {
    const rows = extractBeliefs([
      run('claude', 'Acme provides private 5G networks, small-cell infrastructure and IoT, with a product portfolio spanning RAN.'),
      run('openai', 'Acme specializes in private 5G, small cell networks, and IoT connectivity for enterprises and operators.'),
    ], 'Acme');
    const products = rows.filter((r) => r.field === 'Product line').map((r) => r.claim);
    expect(products).toEqual(expect.arrayContaining(['private 5G', 'IoT']));
    expect(products.some((p) => /small.cell/i.test(p))).toBe(true);
    expect(products.filter((p) => /small.cell/i.test(p))).toHaveLength(1);
    expect(products).not.toEqual(expect.arrayContaining(['with', 'with a product portfolio', 'spanning RAN']));
    expect(rows.filter((r) => r.field === 'Segment').map((r) => r.claim).sort()).toEqual(['enterprises', 'operators']);
  });
  it('errored and category runs contribute nothing; the words correct/wrong never appear', () => {
    const rows = extractBeliefs([
      run('claude', 'Based in Austin, Texas.', { error: 'rate limited' }),
      { engine: 'gemini', queryType: 'category', transcript: 'Vendors include Acme, based in Austin, Texas.' },
    ], 'Acme');
    expect(rows).toEqual([]);
    const md = beliefsMarkdown(extractBeliefs([run('claude', 'Based in Austin, Texas.')], 'Acme'), 1).join('\n');
    expect(md).toContain('| **Headquarters:** Austin, Texas | Claude | 1 | Single-source |');
    expect(md).not.toMatch(/\b(correct|wrong|accurate|false)\b/i);
    expect(md).toMatch(/agreement, not truth/);
  });
});

/** Acceptance on the stored Nybsys sweep (local export only; skipped elsewhere). */
const EXPORT = '/tmp/claude-1000/-mnt-c-src-aeo-app1/037f8049-e28c-4e87-b501-2be704094e78/scratchpad/nybsys-sweep.json';
describe.skipIf(!existsSync(EXPORT))('Lane B acceptance — Nybsys 2026-09-30', () => {
  it('shows HQ San Jose CA (all four engines), CEO Moshtaq Ahmed, and product lines', () => {
    const d = JSON.parse(readFileSync(EXPORT, 'utf8'));
    const runs = d.runs.map((r: any) => ({ engine: r.engine, queryType: r.query_type, transcript: r.transcript }));
    const rows = extractBeliefs(runs, 'Nybsys');
    expect(rows.find((r) => r.field === 'Headquarters')).toMatchObject({ claim: 'San Jose, California', status: 'Consistent', saidBy: ['claude', 'openai', 'perplexity', 'gemini'] });
    expect(rows.find((r) => r.field === 'Founder / CEO')).toMatchObject({ claim: 'Moshtaq Ahmed', status: 'Consistent' });
    expect(rows.find((r) => r.field === 'Founded')).toMatchObject({ claim: '2006', status: 'Single-source' });
    expect(rows.filter((r) => r.field === 'Product line' && r.status === 'Consistent').map((r) => r.claim)).toEqual(expect.arrayContaining(['private 5G', 'IoT', 'security gateways']));
  });
});
