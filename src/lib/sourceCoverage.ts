// WO-AEO-REPORT-SOURCE-COVERAGE-012 B — Source coverage, the deterministic half.
//
// Which pages do the engines read for a customer's category questions, and does each one name
// the customer? This module decides WHICH pages to read (from the sweep's stored cited URLs), how
// a page is judged to name the customer, and the report lines. The fetching itself lives in
// api/_lib/sourceFetch.ts (server-side, robots-respecting). No LLM, no engine call.
//
// Definitions (7 Sep 2026, "corpus presence"): the denominator D is the number of distinct source
// sites (registrable hosts) cited across the category answers. A site is RECURRING when two or
// more category answers cite it. The fetch pass reads up to 3 of its most-cited URLs, 40 per sweep.
//
// Import-light on purpose: a serverless route imports this file (relative imports end in .js).
import { normalizeDomain, isErroredRun, isModelPrior, effectiveCompetitorSet, competitorsCited, type Competitor, type SweepRunResult } from './citationSweep.js';
import { classifyQuerySegment, SEGMENT_LABEL } from './querySegment.js';

export const MAX_URLS_PER_HOST = 3;
export const MAX_URLS_PER_SWEEP = 40;
export const RECURRING_MIN_ANSWERS = 2;

/** The answer engines' own sites: never a source page about the customer. */
const ENGINE_HOSTS = new Set([
  'openai.com', 'chatgpt.com', 'claude.ai', 'anthropic.com', 'perplexity.ai', 'google.com',
  'gemini.google.com', 'x.ai', 'grok.com', 'bing.com', 'microsoft.com',
]);

/** Gemini's grounding wrapper. The target is not in the stored data, so it is excluded. */
export function isGroundingRedirect(url: string): boolean {
  return /vertexaisearch\.cloud\.google\.com\/grounding-api-redirect/i.test(String(url || ''));
}

/** Registrable host ("blog.foo.com" → "foo.com"), same rule as the rest of the sweep core. */
export function siteOf(url: string): string {
  const parts = normalizeDomain(url).split('.').filter(Boolean);
  return parts.length <= 2 ? parts.join('.') : parts.slice(-2).join('.');
}

export interface CoveragePage { host: string; url: string; citedIn: number }
export interface CoverageHost { host: string; timesCited: number; engines: string[]; urls: CoveragePage[] }
export interface CoveragePlan {
  /** D: distinct sites cited across the category answers (after exclusions). */
  distinctSites: number;
  recurring: CoverageHost[];
  /** The pages to fetch, most-cited first, capped. */
  pages: CoveragePage[];
}

const usableCategoryRun = (r: SweepRunResult) =>
  r.queryType === 'category' && !isErroredRun(r) && !r.truncated && !isModelPrior(r);

/** Choose the pages the fetch pass reads. `excludeHosts` = the customer's own domain(s). */
export function planSourceCoverage(runs: SweepRunResult[], clientDomain: string, excludeHosts: string[] = []): CoveragePlan {
  const own = new Set([clientDomain, ...excludeHosts].map((d) => siteOf(d)).filter(Boolean));
  const hosts = new Map<string, { answers: number; engines: Set<string>; urls: Map<string, number> }>();
  for (const r of runs.filter(usableCategoryRun)) {
    const seenHosts = new Set<string>();
    const seenUrls = new Set<string>();
    for (const raw of r.sources || []) {
      const url = String(raw || '').trim();
      if (!/^https?:\/\//i.test(url) || isGroundingRedirect(url)) continue;
      const host = siteOf(url);
      if (!host || !host.includes('.') || own.has(host) || ENGINE_HOSTS.has(host)) continue;
      const h = hosts.get(host) ?? { answers: 0, engines: new Set<string>(), urls: new Map<string, number>() };
      if (!seenHosts.has(host)) { h.answers += 1; seenHosts.add(host); }
      h.engines.add(r.engine);
      const clean = url.replace(/#.*$/, '');
      if (!seenUrls.has(clean)) { h.urls.set(clean, (h.urls.get(clean) || 0) + 1); seenUrls.add(clean); }
      hosts.set(host, h);
    }
  }
  const recurring: CoverageHost[] = [...hosts.entries()]
    .filter(([, h]) => h.answers >= RECURRING_MIN_ANSWERS)
    .map(([host, h]) => ({
      host, timesCited: h.answers, engines: [...h.engines].sort(),
      urls: [...h.urls.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, MAX_URLS_PER_HOST).map(([url, citedIn]) => ({ host, url, citedIn })),
    }))
    .sort((a, b) => b.timesCited - a.timesCited || a.host.localeCompare(b.host));
  const pages = recurring.flatMap((h) => h.urls)
    .sort((a, b) => b.citedIn - a.citedIn || a.host.localeCompare(b.host))
    .slice(0, MAX_URLS_PER_SWEEP);
  return { distinctSites: hosts.size, recurring, pages };
}

/** How a page is judged to name the customer: the full brand name (and its no-space form) at word
 *  boundaries, or the bare domain. A generic fragment never counts on its own ("AEO" alone, for us). */
export function brandMatchers(brand: string | null | undefined, domain: string): RegExp[] {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const out: RegExp[] = [];
  const b = String(brand || '').trim();
  if (b.length >= 4) {
    out.push(new RegExp(`(^|[^a-z0-9])${esc(b).replace(/\s+/g, '\\s+')}([^a-z0-9]|$)`, 'i'));
    if (/\s/.test(b)) out.push(new RegExp(`(^|[^a-z0-9])${esc(b.replace(/\s+/g, ''))}([^a-z0-9]|$)`, 'i'));
  }
  const d = normalizeDomain(domain);
  if (d) out.push(new RegExp(`(^|[^a-z0-9.-])${esc(d)}([^a-z0-9-]|$)`, 'i'));
  return out;
}

export function namesYou(text: string, matchers: RegExp[]): boolean {
  return matchers.some((rx) => rx.test(String(text || '')));
}

export type CoverageVerdict = 'yes' | 'no' | 'unreadable';
export interface CoverageRow {
  host: string; timesCited: number; engines: string[]; url: string;
  verdict: CoverageVerdict;
  /** Why a page could not be read: "robots", "timeout", "HTTP 403", "not HTML", "error". */
  reason?: string;
}
export interface SourceCoverage {
  fetchedAt: string;          // ISO date of the fetch, never the sweep date
  distinctSites: number;      // D
  rows: CoverageRow[];
}

export function coverageCounts(c: SourceCoverage) {
  const yes = c.rows.filter((r) => r.verdict === 'yes').length;
  const unreadable = c.rows.filter((r) => r.verdict === 'unreadable').length;
  return { yes, n: c.rows.length, unreadable, no: c.rows.length - yes - unreadable };
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** "You are named on X of N recurring pages engines read for your category questions (fetched
 *  <date>; M could not be read)." and the D line under it. */
export function coverageHeadline(c: SourceCoverage): { headline: string; sites: string } {
  const { yes, n, unreadable } = coverageCounts(c);
  return {
    headline: `You are named on ${yes} of ${n} recurring pages engines read for your category questions (fetched ${fmtDate(c.fetchedAt)}; ${unreadable} could not be read).`,
    sites: `Engines cited ${c.distinctSites} distinct sites across your category answers.`,
  };
}

/** The Outreach action: the "No" rows, by times cited, described only as data. */
export function coverageAction(c: SourceCoverage): { title: string; items: string[] } | null {
  const no = c.rows.filter((r) => r.verdict === 'no').sort((a, b) => b.timesCited - a.timesCited);
  if (!no.length) return null;
  return {
    title: 'Pages engines read that do not name you yet',
    items: no.map((r) => `${r.url} (${r.host}; cited in ${r.timesCited} category answer${r.timesCited === 1 ? '' : 's'} by ${r.engines.join(', ')})`),
  };
}

// ── B10: corroboration in the branded answers (no fetch) ─────────────────────────────────────
export interface Corroboration { sources: number; thirdParty: number; hosts: string[] }

export function corroboration(runs: SweepRunResult[], clientDomain: string, excludeHosts: string[] = []): Corroboration {
  const own = new Set([clientDomain, ...excludeHosts].map((d) => siteOf(d)).filter(Boolean));
  const all = new Set<string>();
  for (const r of runs) {
    if (r.queryType !== 'branded' || isErroredRun(r) || r.truncated) continue;
    for (const u of r.sources || []) {
      if (!/^https?:\/\//i.test(String(u)) || isGroundingRedirect(String(u))) continue;
      const h = siteOf(String(u)); if (h) all.add(h);
    }
  }
  const hosts = [...all].filter((h) => !own.has(h)).sort();
  return { sources: all.size, thirdParty: hosts.length, hosts };
}

export function corroborationLine(c: Corroboration): string {
  return `When asked about you by name, engines cited ${c.sources} source${c.sources === 1 ? '' : 's'}; ${c.thirdParty} ${c.thirdParty === 1 ? 'was' : 'were'} not your own site.`;
}

// ── B11: how many answers named any vendor, per question and per segment ───────────────────
export interface VendorBaseRow { label: string; answers: number; recommendedYou: number; namedVendor: number }

/** An answer "named at least one vendor" when it recommended the customer or any vendor in the
 *  sweep's effective competitor set (entered plus named by the answers themselves, the same set
 *  "Cited instead of you" counts). The headline rate's denominator never changes; this is a base
 *  shown beside it. */
export function vendorBase(runs: SweepRunResult[], client?: { domain: string; brand?: string }, entered: Competitor[] = []): { perQuestion: VendorBaseRow[]; perSegment: VendorBaseRow[] } {
  const effective = client ? effectiveCompetitorSet(runs, client, entered) : null;
  const q = new Map<string, VendorBaseRow>();
  const s = new Map<string, VendorBaseRow>();
  for (const r of runs.filter(usableCategoryRun)) {
    const named = !!r.cited || (effective ? competitorsCited(r, effective).length > 0 : (r.citedCompetitors || []).length > 0);
    const seg = SEGMENT_LABEL[classifyQuerySegment(r.query, r.queryType)] || 'Other';
    for (const [map, key] of [[q, r.query], [s, seg]] as const) {
      const row = map.get(key) ?? { label: key, answers: 0, recommendedYou: 0, namedVendor: 0 };
      row.answers += 1; if (r.cited) row.recommendedYou += 1; if (named) row.namedVendor += 1;
      map.set(key, row);
    }
  }
  const order = (a: VendorBaseRow, b: VendorBaseRow) => b.answers - a.answers || a.label.localeCompare(b.label);
  return { perQuestion: [...q.values()].sort(order), perSegment: [...s.values()].sort(order) };
}

export function vendorBaseLine(r: VendorBaseRow): string {
  return `${r.recommendedYou} of ${r.answers} recommended you; ${r.namedVendor} of ${r.answers} named at least one vendor.`;
}
