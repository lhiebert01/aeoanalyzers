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
import { tierForDomain } from './authorityTiers.js';

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
  /** WO-014: the page's own title and byline, when the fetched page states them. */
  title?: string;
  byline?: string;
  /** WO-015: a contact route found ON the fetched page (the publisher's own site): its author page,
   *  a published email address, or its contact page. Absent means "Fill in:", never a guess. */
  contact?: ContactRoute;
  /** WO-015: the page's own site sells a self-serve software product (sign-up, free trial or log-in
   *  links on the page). A pricing page alone is not this signal: agencies have pricing too. */
  sellsProduct?: boolean;
}

/** WO-015: self-serve software signals on the fetched page: a sign-up, free-trial, start-free or
 *  log-in link, or a link into an app subdomain. Agencies that sell services do not show these. */
export function pageSellsProduct(html: string, pageUrl?: string, homepage = false): boolean {
  const h = String(html || '');
  let site = ''; try { site = new URL(pageUrl || '').hostname.replace(/^www\./, '').split('.').slice(-2).join('.'); } catch { /* no site check */ }
  const sameSite = (href: string) => { if (!site) return true; try { return new URL(href, pageUrl).hostname.replace(/^www\./, '').endsWith(site); } catch { return false; } };
  const anchors = [...h.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() })).filter((a) => !a.href.startsWith('#') && !/^subscribe$/i.test(a.text));
  // On a homepage, a call to action rendered as a button counts too (an article can mention another tool's "free trial" in its text; a homepage button is the site's own offer).
  if (homepage && [...h.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].some((m) => /\b(free trial|start (a |your )?free|try (it |us )?(for )?free|get started (for )?free|book a demo|request a demo|get a demo|schedule a demo|start for free|sign up for free|start (your )?trial)\b/i.test(m[1].replace(/<[^>]+>/g, ' ')))) return true;
  // Newsletter "sign up" and generic "log in" links are not product signals (blogs and agencies
  // have both); only software-specific calls to action and app links count.
  return anchors.some((a) => (/\b(free trial|start (a |your )?free|try (it |us )?(for )?free|get started (for )?free|book a demo|request a demo|get a demo|schedule a demo|start for free|sign up for free|start (your )?trial)\b/i.test(a.text) && sameSite(a.href)) || (/^https?:\/\/(app|dashboard|portal)\./i.test(a.href) && sameSite(a.href)) || (/\/(signup|sign-up|trial)(\/|\?|$)/i.test(a.href) && sameSite(a.href)));
}

export interface ContactRoute { kind: 'author' | 'email' | 'contact'; value: string }

/** WO-015: the contact route a page itself publishes, in order of usefulness for a pitch: the
 *  author's page, a published email address, the site's contact page. Same site only (a link to
 *  another domain is not the publisher's route). Never guessed or composed. */
export function pageContactRoute(html: string, pageUrl: string): ContactRoute | undefined {
  const h = String(html || '');
  let base: URL; try { base = new URL(pageUrl); } catch { return undefined; }
  const site = base.hostname.replace(/^www\./, '').split('.').slice(-2).join('.');
  const sameSite = (href: string) => { try { const u = new URL(href, base); return /^https?:$/.test(u.protocol) && u.hostname.replace(/^www\./, '').endsWith(site) ? u.href.split('#')[0] : null; } catch { return null; } };
  const links = [...h.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((m) => ({ tag: m[0], href: m[1] }));
  for (const l of links) if (/rel=["'][^"']*\bauthor\b/i.test(l.tag)) { const u = sameSite(l.href); if (u) return { kind: 'author', value: u }; }
  const relAuthor = h.match(/<link[^>]+rel=["']author["'][^>]*href=["']([^"']+)["']/i); if (relAuthor) { const u = sameSite(relAuthor[1]); if (u) return { kind: 'author', value: u }; }
  for (const l of links) if (/\/(author|authors|people|team\/[^/]+|writers?)\/[^/?#]+/i.test(l.href)) { const u = sameSite(l.href); if (u) return { kind: 'author', value: u }; }
  for (const l of links) { const m = l.href.match(/^mailto:([^?]+)/i); if (m && /@/.test(m[1])) return { kind: 'email', value: decodeURIComponent(m[1]).trim() }; }
  for (const l of links) if (/\/(contact|contact-us|about\/contact|tips|press)\/?$/i.test(l.href.split('?')[0])) { const u = sameSite(l.href); if (u) return { kind: 'contact', value: u }; }
  return undefined;
}

/** WO-014: a page's title and its author or publisher, only as the page itself states them
 *  (author meta, article:author, JSON-LD author/publisher name). Never inferred. */
export function pageTitleAndByline(html: string): { title?: string; byline?: string } {
  const h = String(html || '');
  const dec = (t: string) => t.replace(/&amp;/g, '&').replace(/&#39;|&#039;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—').replace(/\s+/g, ' ').trim();
  const meta = (k: string) => { const tag = h.match(new RegExp(`<meta[^>]+(?:name|property)=["']${k}["'][^>]*>`, 'i')); const c = tag?.[0].match(/content=["']([^"']*)["']/i); return c ? dec(c[1]) : ''; };
  const title = meta('og:title') || dec(h.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '');
  let byline = meta('author') || meta('article:author');
  if (!byline || /^https?:/i.test(byline)) {
    byline = '';
    const rx = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi; let m: RegExpExecArray | null;
    while (!byline && (m = rx.exec(h))) {
      try {
        const j = JSON.parse(m[1]); const nodes = (Array.isArray(j) ? j : [j]).flatMap((x: any) => (Array.isArray(x?.['@graph']) ? x['@graph'] : [x]));
        for (const n of nodes) {
          if (!/Article|BlogPosting|NewsArticle|Review|WebPage/i.test(String(n?.['@type']))) continue;
          const a = Array.isArray(n.author) ? n.author[0] : n.author;
          if (a && typeof a.name === 'string' && a.name.trim()) { byline = dec(a.name); break; }
        }
      } catch { /* skip */ }
    }
  }
  return { ...(title ? { title: title.slice(0, 200) } : {}), ...(byline && !/^https?:/i.test(byline) ? { byline: byline.slice(0, 120) } : {}) };
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

/** 1 Nov 2026 ruling: every Source coverage page carries one of three labels, and the outreach
 *  list runs self-serve first, then independent, then vendor-owned last.
 *   - vendor-owned: the publisher sells in the customer's own category (an entered competitor, or a
 *     vendor the sweep's answers recommended). Its pages recommend its own product.
 *   - self-serve: a listing, directory or community where the customer can publish or list itself
 *     (the attainability registry's "Do now" tier).
 *   - independent: everything else; an editor or author decides, so it is a pitch. */
export type CoverageKind = 'self-serve' | 'independent' | 'vendor-owned';
export const COVERAGE_KIND_LABEL: Record<CoverageKind, string> = {
  'self-serve': 'self-serve (publish or list yourself)',
  independent: 'independent (pitchable)',
  'vendor-owned': 'vendor-owned (unlikely to add you)',
};
export const COVERAGE_KIND_ORDER: CoverageKind[] = ['self-serve', 'independent', 'vendor-owned'];

const regOf = (h: string) => {
  const parts = String(h || '').toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split('/')[0].split('.').filter(Boolean);
  return parts.length <= 2 ? parts.join('.') : parts.slice(-2).join('.');
};

export function coverageKind(host: string, vendorDomains: string[] = []): CoverageKind {
  const reg = regOf(host);
  if (reg && vendorDomains.some((d) => regOf(d) === reg)) return 'vendor-owned';
  if (tierForDomain(host).tier === 'now') return 'self-serve';
  return 'independent';
}

/** The category's vendors for this sweep: entered competitors plus vendors the answers recommended. */
export function categoryVendorDomains(entered: { domain?: string }[] = [], recommended: { domain?: string }[] = []): string[] {
  return [...new Set([...entered, ...recommended].map((c) => regOf(c.domain || '')).filter(Boolean))];
}

/** The Outreach action: the "No" rows, labeled and ordered self-serve, independent, vendor-owned
 *  (times cited within each), described only as data. */
export function coverageAction(c: SourceCoverage, vendorDomains: string[] = []): { title: string; items: string[] } | null {
  const rank = (k: CoverageKind) => COVERAGE_KIND_ORDER.indexOf(k);
  const no = c.rows
    .filter((r) => r.verdict === 'no')
    .map((r) => ({ r, k: coverageKind(r.host, vendorDomains) }))
    .sort((a, b) => rank(a.k) - rank(b.k) || b.r.timesCited - a.r.timesCited);
  if (!no.length) return null;
  return {
    title: 'Pages engines read that do not name you yet',
    items: no.map(({ r, k }) => `${COVERAGE_KIND_LABEL[k]}: ${r.url} (${r.host}; cited in ${r.timesCited} category answer${r.timesCited === 1 ? '' : 's'} by ${r.engines.join(', ')})`),
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
