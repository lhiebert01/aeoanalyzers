// WO-AEO-FIX-IT-PLAYBOOK-015 Lane 0 — are you in the search results the engines read?
//
// Answer engines run an ordinary web search before they answer a category question and read only
// the top results. This module turns a customer's Search Console (or Bing Webmaster Tools)
// Performance export into the derived table the plan needs. It runs in the browser: the file is
// parsed in memory and only the derived table is stored (table search_standing). Deterministic,
// no model call. Import-light so tests and the server can use it.

export type QueryClass = 'brand' | 'category' | 'specific';
export type Band = 'page1' | 'close' | 'far';

export interface GscRow { key: string; clicks: number; impressions: number; position: number }
export interface GscExport { queries: GscRow[]; pages: GscRow[]; period: string | null }
export interface ClassifiedQuery extends GscRow { cls: QueryClass; band: Band; comparesNamed: boolean }
export interface ClassSummary { cls: QueryClass; queries: number; impressions: number; clicks: number; position: number | null; band: Band | null; sentence: string }
export interface SearchStanding {
  source: 'google' | 'bing';
  period: string | null;
  classes: ClassSummary[];
  /** The page with the most impressions that is not the homepage: the one search matches to non-brand searches. */
  categoryPage: { url: string; position: number; impressions: number } | null;
  /** Non-brand searches already on page 1 that do not compare named competitors. */
  winnable: ClassifiedQuery[];
  /** Searches at 11 to 30. */
  close: ClassifiedQuery[];
  /** Searches at 31 or worse, most impressions first. */
  far: ClassifiedQuery[];
  queries: ClassifiedQuery[];
}

export const BAND_LABEL: Record<Band, string> = {
  page1: 'page 1 (1–10): engines can read you here',
  close: 'page 2–3 (11–30): close',
  far: 'page 4+ (31+): engines will not reach you here',
};
export const FAR_LINE = 'Moving these takes links from other sites and time; more pages on your own site will not move them by themselves.';
export const NO_EXPORT_LINE = 'Add your Search Console export to see where you stand in the searches the engines run.';
export const EXPORT_STEPS = [
  'Open Google Search Console and choose your site.',
  'Click Performance (Search results).',
  'Set the date range to Last 3 months.',
  'Click Export, then Download Excel (or Download CSV).',
  'Upload the downloaded file here. It is read in your browser; only the summary is kept.',
];

export function band(position: number): Band { return position <= 10 ? 'page1' : position <= 30 ? 'close' : 'far'; }

const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9.]+/g, ' ').replace(/\s+/g, ' ').trim();
const QUESTION = /^(how|what|why|which|who|where|when|is|are|can|does|do|should|tell|compare|i'm|i am|im)\b/;

/** brand: contains the customer's name (singular or plural) or domain; specific: six or more words
 *  or a question; category: everything else. */
export function classifyQuery(query: string, brand: { name?: string | null; domain: string; people?: string[] }): QueryClass {
  const q = norm(query);
  const root = norm(brand.domain).replace(/^www\./, '').split('.')[0];
  const names = [brand.name, ...(brand.people || [])].filter(Boolean).map((n) => norm(n!));
  const singular = (n: string) => n.replace(/s$/, '');
  if ((root && q.replace(/\s/g, '').includes(root.replace(/\s/g, ''))) || names.some((n) => n && (q.includes(n) || q.includes(singular(n))))) return 'brand';
  const words = q.split(' ').filter(Boolean).length;
  if (words >= 6 || /\?/.test(query) || QUESTION.test(q)) return 'specific';
  return 'category';
}

/** A query naming two or more vendors, or "A vs B", is a comparison: never a winnable page. */
export function comparesNamedVendors(query: string, vendorNames: string[] = []): boolean {
  const q = query.toLowerCase();
  const hits = new Set(vendorNames.map((v) => v.toLowerCase().trim()).filter((v) => v.length > 2 && new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q)));
  if (hits.size >= 2) return true;
  return /\b\w[\w.]*\s+(vs\.?|versus)\s+\w/.test(q) && !/\b(geo|aeo|seo)\s+(vs\.?|versus)\s+(geo|aeo|seo)\b/.test(q);
}

function weighted(rows: GscRow[]): number | null {
  const imp = rows.reduce((a, r) => a + r.impressions, 0);
  if (!imp) return null;
  return Math.round((rows.reduce((a, r) => a + r.position * r.impressions, 0) / imp) * 10) / 10;
}

const CLASS_LABEL: Record<QueryClass, string> = { brand: 'Your name', category: 'Category searches', specific: 'Specific questions' };

function sentence(cls: QueryClass, pos: number | null): string {
  if (pos === null) return `${CLASS_LABEL[cls]}: no searches in this export.`;
  const b = band(pos);
  if (cls === 'category' && b === 'far') return `Your category searches average position ${pos}. Engines read roughly the top 10 to 20 results, so they do not reach your pages for these questions.`;
  if (cls === 'brand' && b !== 'page1') return `Searches for your name average position ${pos}. That is close: the homepage title and description are the first fix.`;
  if (b === 'page1') return `${CLASS_LABEL[cls]} average position ${pos}: on page 1, where engines read.`;
  if (b === 'close') return `${CLASS_LABEL[cls]} average position ${pos}: close to where engines read.`;
  return `${CLASS_LABEL[cls]} average position ${pos}: beyond where engines read.`;
}

export function deriveStanding(exp: GscExport, ctx: { domain: string; brand?: string | null; people?: string[]; vendorNames?: string[]; source?: 'google' | 'bing' }): SearchStanding {
  const queries: ClassifiedQuery[] = exp.queries.map((r) => ({ ...r, cls: classifyQuery(r.key, { name: ctx.brand, domain: ctx.domain, people: ctx.people }), band: band(r.position), comparesNamed: comparesNamedVendors(r.key, ctx.vendorNames) }));
  const classes: ClassSummary[] = (['brand', 'category', 'specific'] as QueryClass[]).map((cls) => {
    const rows = queries.filter((q) => q.cls === cls);
    const pos = weighted(rows);
    return { cls, queries: rows.length, impressions: rows.reduce((a, r) => a + r.impressions, 0), clicks: rows.reduce((a, r) => a + r.clicks, 0), position: pos, band: pos === null ? null : band(pos), sentence: sentence(cls, pos) };
  });
  const home = (u: string) => { try { const p = new URL(u).pathname; return p === '/' || p === ''; } catch { return false; } };
  const cp = exp.pages.filter((p) => !home(p.key)).sort((a, b) => b.impressions - a.impressions)[0];
  const byImp = (a: ClassifiedQuery, b: ClassifiedQuery) => b.impressions - a.impressions || a.position - b.position;
  return {
    source: ctx.source || 'google',
    period: exp.period,
    classes,
    categoryPage: cp ? { url: cp.key, position: Math.round(cp.position * 10) / 10, impressions: cp.impressions } : null,
    winnable: queries.filter((q) => q.cls !== 'brand' && q.band === 'page1' && !q.comparesNamed).sort((a, b) => a.position - b.position),
    close: queries.filter((q) => q.band === 'close' && !q.comparesNamed).sort(byImp),
    far: queries.filter((q) => q.cls !== 'brand' && q.band === 'far').sort(byImp),
    queries,
  };
}

// ── Parsing (in the browser; also used by tests) ─────────────────────────────────────────────

const num = (s: string) => { const n = Number(String(s).replace(/[%,\s]/g, '')); return Number.isFinite(n) ? n : 0; };

function rowsToGsc(rows: string[][]): GscRow[] {
  if (!rows.length) return [];
  const h = rows[0].map((x) => x.toLowerCase().trim());
  const ix = (re: RegExp) => h.findIndex((x) => re.test(x));
  const k = 0, c = ix(/^clicks?$/), i = ix(/^impressions?$/), p = ix(/^(average )?position$/);
  if (c < 0 || i < 0 || p < 0) throw new Error('This file does not look like a Search Console Performance export (Clicks, Impressions and Position columns are missing).');
  return rows.slice(1).filter((r) => r[k] && r[k].trim()).map((r) => ({ key: r[k].replace(/\s+/g, ' ').trim(), clicks: num(r[c]), impressions: num(r[i]), position: num(r[p]) }));
}

/** CSV: the "Queries.csv" (or "Pages.csv") from a CSV export, or one combined CSV. */
export function parseCsv(text: string): string[][] {
  const out: string[][] = []; let row: string[] = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; continue; }
    if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); out.push(row); row = []; cur = ''; } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); out.push(row); }
  return out.filter((r) => r.some((x) => x.trim()));
}

export function exportFromCsv(queriesCsv: string, pagesCsv?: string | null): GscExport {
  const qs = parseCsv(queriesCsv.replace(/^﻿/, ''));
  const first = (qs[0]?.[0] || '').toLowerCase();
  // A pages CSV uploaded on its own still parses; its rows are pages, not queries.
  if (/page/.test(first) && !pagesCsv) return { queries: [], pages: rowsToGsc(qs), period: null };
  return { queries: rowsToGsc(qs), pages: pagesCsv ? rowsToGsc(parseCsv(pagesCsv.replace(/^﻿/, ''))) : [], period: null };
}

/** XLSX: the standard export workbook (sheets "Queries" and "Pages", plus "Filters" for the date
 *  range). `unzip` is injected (JSZip in the browser) so this module stays import-light. */
export async function exportFromXlsx(buf: ArrayBuffer | Uint8Array, unzip: (b: ArrayBuffer | Uint8Array) => Promise<{ file: (n: string) => { async: (t: 'string') => Promise<string> } | null }>): Promise<GscExport> {
  const z = await unzip(buf);
  const read = async (n: string) => { const f = z.file(n); return f ? f.async('string') : ''; };
  const wb = await read('xl/workbook.xml');
  const rels = await read('xl/_rels/workbook.xml.rels');
  const shared = [...(await read('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
  const unxml = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const sheetPath = (name: string) => {
    const s = [...wb.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].find((m) => m[1].toLowerCase() === name.toLowerCase());
    if (!s) return null;
    const r = rels.match(new RegExp(`Id="${s[2]}"[^>]*Target="([^"]+)"`)) || rels.match(new RegExp(`Target="([^"]+)"[^>]*Id="${s[2]}"`));
    return r ? 'xl/' + r[1].replace(/^\/?xl\//, '') : null;
  };
  const sheet = async (name: string): Promise<string[][]> => {
    const p = sheetPath(name); if (!p) return [];
    const x = await read(p);
    return [...x.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) => [...r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map((c) => {
      const t = (c[1].match(/t="(\w+)"/) || [])[1]; const inner = c[2] || '';
      if (t === 'inlineStr') return unxml((inner.match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || '');
      const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || '';
      return t === 's' ? unxml(shared[Number(v)] || '') : unxml(v);
    }));
  };
  const q = await sheet('Queries'); const pg = await sheet('Pages'); const f = await sheet('Filters');
  if (!q.length) throw new Error('This workbook has no "Queries" sheet. Export it from Search Console, Performance, Export, Download Excel.');
  const period = (f.find((r) => /date/i.test(r[0] || '')) || [])[1] || null;
  return { queries: rowsToGsc(q), pages: rowsToGsc(pg), period };
}

/** What is stored: the derived table only (no raw file). Trimmed to the queries the plan uses. */
export function toStored(s: SearchStanding) {
  const slim = (q: ClassifiedQuery) => ({ key: q.key, cls: q.cls, band: q.band, position: q.position, impressions: q.impressions, clicks: q.clicks, comparesNamed: q.comparesNamed });
  return { source: s.source, period: s.period, classes: s.classes, categoryPage: s.categoryPage, winnable: s.winnable.slice(0, 20).map(slim), close: s.close.slice(0, 20).map(slim), far: s.far.slice(0, 20).map(slim), queries: s.queries.slice(0, 200).map(slim) };
}
