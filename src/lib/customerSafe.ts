// WO-AEO-BRANDED-ACCURACY-004 Part B — nothing that can reach a customer shows what producing it cost,
// or anything else internal. Customer-safe BY CONSTRUCTION, in two layers:
//
//   1. stripCost() at the ENTRY of every export builder (buildSweepReport, assembleReportData):
//      the builder never receives a cost figure, so no future line it writes can print one.
//   2. sanitizeCustomerExport() at the EXIT of every export builder: the one sanitizer every
//      Markdown / Word / PDF / executive-report artifact passes through. It removes any line in the
//      report's OWN text that carries a leak, and reports what it removed.
//
// The regression test (customerSafe.test.ts) builds every format from a real sweep and fails if the
// sanitizer had anything to remove — layer 2 must never have to act; when it does, a test is red.
//
// Scope. The verbatim appendix holds the engines' answers as given, and an engine may quote a
// product's price ("Bigin starts at $9/month") or say "lower cost alternative". That is evidence, not
// us quoting a price, so the appendix is exempt from the cost-word and currency rules — and still
// checked for internal paths and admin markers, which no engine answer can legitimately contain.
// Cost stays visible to the founder ON SCREEN only (results page, History), never in an artifact.

import type { SweepRunResult, SweepSummary } from './citationSweep';

/** A copy with every cost field zeroed. Exports never receive a cost. */
export function stripCost<T extends { runs: SweepRunResult[]; summary?: SweepSummary }>(r: T): T {
  return {
    ...r,
    runs: r.runs.map((x) => ({ ...x, costUsd: 0 })),
    ...(r.summary ? { summary: { ...r.summary, totalCostUsd: 0, engines: r.summary.engines.map((e) => ({ ...e, costUsd: 0 })) } } : {}),
  };
}

export type LeakClass = 'currency-figure' | 'cost-term' | 'token-count' | 'internal-path' | 'commit-id' | 'admin-marker' | 'other-customer';

const RULES: { cls: LeakClass; re: RegExp; verbatimToo: boolean }[] = [
  // a currency symbol attached to a figure: $0.84, $ 12, €3, £4.50
  { cls: 'currency-figure', re: /[$€£]\s?\d/, verbatimToo: false },
  // cost / spend / usd / per-call pricing next to a number
  { cls: 'cost-term', re: /\b(?:costs?|spend|spent|usd|per[- ]call|per[- ]run|price per)\b[^\n.]{0,24}\d|\d[\d.,]*\s*usd\b/i, verbatimToo: false },
  // a token count presented as a quantity
  { cls: 'token-count', re: /\b\d[\d,]*\s*(?:input |output |prompt |completion )?tokens\b/i, verbatimToo: false },
  // internal filesystem / repo paths
  { cls: 'internal-path', re: /(?:^|[\s(`'"])(?:private\/|docs\/baselines|\/mnt\/|[A-Z]:\\(?:src|Users)|scripts\/[\w-]+\.(?:ts|mjs|py)|supabase\/migrations|src\/lib\/)/, verbatimToo: true },
  // commit ids and deployment ids (hex with at least one digit and one letter, or dpl_)
  { cls: 'commit-id', re: /\bdpl_[A-Za-z0-9]{10,}\b|\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/, verbatimToo: false },
  // admin-only markers
  { cls: 'admin-marker', re: /\badmin(?:-only)?\b|COST_SCALE|\bisAdmin\b|\binternal only\b/i, verbatimToo: true },
];

// The verbatim appendix starts at its heading — in Markdown ("## Appendix …") and in text extracted
// from the Word or PDF, where the "##" is gone.
const APPENDIX = /^\s*(?:##\s+)?Appendix — transcripts/;

export interface Leak { cls: LeakClass; line: string }

/** Every leak in a customer artifact. `knownDomains` = the domains this sweep's own inputs carry; any
 *  other customer domain written in the report's OWN text is a leak (other customers never belong). */
export function findLeaks(text: string, opts: { otherCustomerDomains?: string[] } = {}): Leak[] {
  const out: Leak[] = [];
  let verbatim = false;
  const others = (opts.otherCustomerDomains || []).map((d) => d.toLowerCase());
  for (const line of text.split('\n')) {
    if (APPENDIX.test(line)) verbatim = true;
    for (const r of RULES) if ((!verbatim || r.verbatimToo) && r.re.test(line)) out.push({ cls: r.cls, line });
    if (!verbatim) for (const d of others) if (line.toLowerCase().includes(d)) out.push({ cls: 'other-customer', line });
  }
  return out;
}

/** The one sanitizer every customer export passes through. Removes leaking lines; reports them. */
export function sanitizeCustomerExport(text: string, opts: { otherCustomerDomains?: string[] } = {}): { text: string; removed: Leak[] } {
  const leaks = findLeaks(text, opts);
  if (!leaks.length) return { text, removed: [] };
  const bad = new Set(leaks.map((l) => l.line));
  return { text: text.split('\n').filter((l) => !bad.has(l)).join('\n'), removed: leaks };
}
