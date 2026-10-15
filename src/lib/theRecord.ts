// WO-AEO-REPORT-SOURCE-COVERAGE-012 G — the Record, the deterministic half.
//
// What the customer did, with dates, beside what the next measurement showed. It states timing
// only: never "because of", "resulted in", "improved", "thanks to". When the engine panel
// differs between the two sweeps, both sets are shown and no change is computed.
//
// Import-free on purpose: the client and the tests both use it.
import type { OwnerTag } from './ownerTags';

export interface RecordEntry {
  id?: string;
  domain: string;
  title: string;
  owner_tag: OwnerTag;
  source: 'plan' | 'own';
  action_key?: string | null;
  /** YYYY-MM-DD */
  done_at: string;
  note?: string | null;
  link?: string | null;
}

export const RECORD_GATED = 'The Record is included on Pro and Business.';
export const MEASURED_AFTER = 'Measured after these actions.';
export const PANEL_DIFFERS = 'Different engine panel, so no change is computed.';
/** Words the Record never prints about its own entries or figures. */
export const CAUSAL_WORDS = /\b(because of|resulted in|improved|improvement|thanks to|led to|caused|drove)\b/i;

/** Figures for one sweep, each with its denominator. Null = not measured on that sweep. */
export interface SweepFigures {
  date: string;              // ISO
  panel: string;             // panel version, e.g. "v1.2"
  engines: string[];         // engine ids, sorted
  foundByName: { cited: number; n: number } | null;
  recommended: { cited: number; n: number } | null;
  coverage: { yes: number; n: number } | null;
  corroboration: { thirdParty: number; sources: number } | null;
}

export const byDate = (a: RecordEntry, b: RecordEntry) => a.done_at.localeCompare(b.done_at) || a.title.localeCompare(b.title);

/** Entries done after the previous sweep's day and on or before this sweep's day. */
export function entriesBetween(entries: RecordEntry[], previousIso: string, currentIso: string): RecordEntry[] {
  const from = previousIso.slice(0, 10), to = currentIso.slice(0, 10);
  return entries.filter((e) => e.done_at > from && e.done_at <= to).sort(byDate);
}

export function samePanel(a: SweepFigures, b: SweepFigures): boolean {
  return a.panel === b.panel && a.engines.join(',') === b.engines.join(',');
}

const fmtDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const pair = (f: { cited: number; n: number } | null) => (f && f.n ? `${f.cited} of ${f.n}` : 'not measured');

/** The figure rows, labelled; each value carries its denominator. */
function figureRows(f: SweepFigures): [string, string][] {
  return [
    ['Found when asked by name', `${pair(f.foundByName)} answers`],
    ['Recommended on category questions', `${pair(f.recommended)} answers`],
    ['Source coverage', f.coverage && f.coverage.n ? `named on ${f.coverage.yes} of ${f.coverage.n} recurring pages` : 'not checked'],
    ['Corroboration', f.corroboration ? `${f.corroboration.thirdParty} of ${f.corroboration.sources} sources not your own site` : 'not measured'],
  ];
}

/** The same block as data, for the screen. Null when nothing was done in the window. */
export function measuredAfterView(entries: RecordEntry[], previous: SweepFigures, now: SweepFigures) {
  const done = entriesBetween(entries, previous.date, now.date);
  if (!done.length) return null;
  return { done, same: samePanel(previous, now), previous: { label: fmtDay(previous.date), panel: `${previous.panel}: ${previous.engines.join(', ')}`, rows: figureRows(previous) }, now: { label: fmtDay(now.date), panel: `${now.panel}: ${now.engines.join(', ')}`, rows: figureRows(now) } };
}
export { fmtDay };

/** "Measured after these actions." — markdown lines. Empty when nothing was done in the window. */
export function measuredAfter(entries: RecordEntry[], previous: SweepFigures, now: SweepFigures): string[] {
  const done = entriesBetween(entries, previous.date, now.date);
  if (!done.length) return [];
  const out: string[] = [`**${MEASURED_AFTER}**`, ''];
  for (const e of done) out.push(`- ${fmtDay(e.done_at)}: ${e.title} (${e.owner_tag})${e.link ? ` ${e.link}` : ''}`);
  out.push('');
  const prev = figureRows(previous), cur = figureRows(now);
  if (samePanel(previous, now)) {
    out.push(`| Figure | ${fmtDay(previous.date)} | ${fmtDay(now.date)} |`);
    out.push('|---|---|---|');
    prev.forEach(([label, v], i) => out.push(`| ${label} | ${v} | ${cur[i][1]} |`));
  } else {
    out.push(PANEL_DIFFERS);
    out.push('');
    out.push(`| Figure | ${fmtDay(previous.date)} (panel ${previous.panel}: ${previous.engines.join(', ')}) |`);
    out.push('|---|---|');
    prev.forEach(([label, v]) => out.push(`| ${label} | ${v} |`));
    out.push('');
    out.push(`| Figure | ${fmtDay(now.date)} (panel ${now.panel}: ${now.engines.join(', ')}) |`);
    out.push('|---|---|');
    cur.forEach(([label, v]) => out.push(`| ${label} | ${v} |`));
  }
  out.push('');
  out.push('_The dates show when things were done and when the figures were measured; they do not show cause._');
  return out;
}

const csvCell = (v: string | null | undefined) => {
  const s = String(v ?? '');
  // Neutralize spreadsheet formulas, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** "Download the Record" — CSV, oldest first. */
export function recordCsv(entries: RecordEntry[]): string {
  const rows = [...entries].sort(byDate);
  const head = ['Date done', 'Action', 'Owner', 'Source', 'Note', 'Link', 'Domain'];
  return [head.map(csvCell).join(','), ...rows.map((e) => [e.done_at, e.title, e.owner_tag, e.source === 'plan' ? 'From the plan' : 'Added by you', e.note, e.link, e.domain].map(csvCell).join(','))].join('\r\n') + '\r\n';
}

/** The Record section for the Word handoff, oldest first. */
export function recordSection(entries: RecordEntry[]): string[] {
  if (!entries.length) return [];
  const out = ['## The Record', '_What was done, and when, oldest first._', '', '| Date | Action | Owner | Note | Link |', '|---|---|---|---|---|'];
  const cell = (s: string | null | undefined) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  for (const e of [...entries].sort(byDate)) out.push(`| ${e.done_at} | ${cell(e.title)} | ${e.owner_tag} | ${cell(e.note)} | ${cell(e.link)} |`);
  out.push('');
  return out;
}
