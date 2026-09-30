import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { sweepScorecard, type SweepRunResult } from '../lib/citationSweep';
/** WO-AEO-REPORT-POLISH-001 Lane A acceptance, run against the STORED 2026-09-30 Nybsys
 *  sweep (48 transcripts). The fixture is a local export of sweep_results — not committed
 *  (customer transcripts) — so this suite skips cleanly when it is absent. */
const FX = '/tmp/claude-1000/-mnt-c-src-aeo-app1/037f8049-e28c-4e87-b501-2be704094e78/scratchpad/nybsys-sweep.json';
const present = existsSync(FX);
describe.skipIf(!present)('Lane A acceptance — Nybsys 2026-09-30 stored sweep', () => {
  const d = present ? JSON.parse(readFileSync(FX, 'utf8')) : null;
  const runs: SweepRunResult[] = (d?.runs ?? []).map((r: any) => ({
    engine: r.engine, query: r.query, queryType: r.query_type, runIndex: r.run_index,
    transcript: r.transcript || '', sources: r.sources || [], costUsd: 0, truncated: !!r.truncated, grounding: r.grounding,
  }));
  const seeds = (d?.sweep?.competitors ?? []).map((c: any) => ({ name: c.name, domain: c.domain }));
  it('names at minimum the seven vendors the WO lists, with counts from the transcripts', () => {
    const sc = sweepScorecard(runs, { domain: 'nybsys.com', brand: 'Nybsys' }, seeds);
    const by = Object.fromEntries(sc.topCompetitors.map((c) => [c.name, c]));
    console.log('CITED INSTEAD (Nybsys 2026-09-30):', sc.topCompetitors.slice(0, 14).map((c) => `${c.name}${c.seeded ? '*' : ''} ${c.count}${c.domain ? ' ' + c.domain : ''}`).join(' | '));
    for (const v of ['Ericsson', 'Celona', 'Nokia', 'CommScope', 'Cisco', 'Mavenir']) expect(by[v], v).toBeDefined();
    expect(Object.keys(by).some((k) => /^Verizon/.test(k))).toBe(true);
    // The old report showed Ericsson 12x / Celona 10x — counted against name-only seeds, so a
    // run that cited ericsson.com as a SOURCE without writing the name was missed. The seed now
    // folds with the domain the answers themselves wrote, and the module's standing rule (a
    // competitor's domain in a retrieved source counts) applies to it: 14 and 11 from the
    // same 48 transcripts. No rule changed; the seeds simply stopped being counted blind.
    expect(by.Ericsson.count).toBe(14); expect(by.Celona.count).toBe(11);
    expect(by.Ericsson.seeded).toBe(true); expect(by.Nokia.seeded).toBe(false);
    for (const junk of ['Justdial', 'Alibaba', 'Thomasnet', 'Tradeindia', 'Sourceforge', 'Marketbeat', 'techtarget', 'Techtarget', 'Dataintelo']) expect(by[junk]).toBeUndefined();
  });
});
