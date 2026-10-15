// WO-AEO-REPORT-SOURCE-COVERAGE-012 B3 — the fetch pass behind Source coverage.
//
// Server-side GET of the pages the engines cited, read as plain HTML (no JavaScript), with an
// honest user agent that names aeoanalyzers.com, robots.txt respected, a 10-second timeout, no
// login, no paywall bypass and at most one retry. A page that fails or is disallowed is
// "Could not read", never a "No". No engine call is made; nothing here is customer-facing cost.
import {
  brandMatchers, namesYou, planSourceCoverage,
  type CoverageRow, type SourceCoverage, pageTitleAndByline } from '../../src/lib/sourceCoverage.js';
import type { SweepRunResult } from '../../src/lib/citationSweep.js';

export const SOURCE_COVERAGE_UA = 'AEOAnalyzersBot/1.0 (+https://aeoanalyzers.com/methodology; source coverage check)';
const ROBOTS_TOKEN = 'aeoanalyzersbot';
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 6;

/** Rules from robots.txt that apply to us: our own group if present, otherwise "*". */
export function robotsRules(txt: string): { allow: string[]; disallow: string[] } {
  const groups: { agents: string[]; allow: string[]; disallow: string[] }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of String(txt || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) { cur = { agents: [], allow: [], disallow: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase()); lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (!cur) continue;
      if (key === 'allow' && val) cur.allow.push(val);
      if (key === 'disallow' && val) cur.disallow.push(val);
    }
  }
  const pick = groups.find((g) => g.agents.some((a) => a !== '*' && ROBOTS_TOKEN.includes(a))) || groups.find((g) => g.agents.includes('*'));
  return pick ? { allow: pick.allow, disallow: pick.disallow } : { allow: [], disallow: [] };
}

/** Longest matching rule wins; Allow wins a tie. Supports "*" and a trailing "$". */
export function robotsAllows(rules: { allow: string[]; disallow: string[] }, path: string): boolean {
  const match = (rule: string) => {
    const rx = new RegExp('^' + rule.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    return rx.test(path) ? rule.length : -1;
  };
  const a = Math.max(-1, ...rules.allow.map(match));
  const d = Math.max(-1, ...rules.disallow.map(match));
  return d < 0 || a >= d;
}

async function get(url: string): Promise<Response> {
  return fetch(url, { headers: { 'User-Agent': SOURCE_COVERAGE_UA, Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5' }, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
}

function visibleText(html: string): string {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
}

type Verdict = Pick<CoverageRow, 'verdict' | 'reason' | 'title' | 'byline'>;

export async function checkPage(url: string, matchers: RegExp[], robotsCache: Map<string, Promise<{ allow: string[]; disallow: string[] } | null>>): Promise<Verdict> {
  let u: URL;
  try { u = new URL(url); } catch { return { verdict: 'unreadable', reason: 'error' }; }
  if (!robotsCache.has(u.origin)) {
    // A missing robots.txt allows; a server error on it is read as "do not crawl" (as major crawlers do).
    robotsCache.set(u.origin, get(`${u.origin}/robots.txt`).then(async (r) => (r.ok ? robotsRules(await r.text()) : r.status >= 500 ? { allow: [], disallow: ['/'] } : null)).catch(() => null));
  }
  const rules = await robotsCache.get(u.origin)!;
  if (rules && !robotsAllows(rules, u.pathname + u.search)) return { verdict: 'unreadable', reason: 'robots' };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await get(url);
      if (r.status >= 500 && attempt === 0) continue; // one retry, on a server error only
      if (!r.ok) return { verdict: 'unreadable', reason: `HTTP ${r.status}` };
      const type = r.headers.get('content-type') || '';
      if (type && !/html|xml|text\/plain/i.test(type)) return { verdict: 'unreadable', reason: 'not HTML' };
      const html = await r.text();
      return { verdict: namesYou(visibleText(html), matchers) ? 'yes' : 'no', ...pageTitleAndByline(html) };
    } catch (err: any) {
      const timeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      if (attempt === 0 && !timeout) continue; // one retry on a network error
      return { verdict: 'unreadable', reason: timeout ? 'timeout' : 'error' };
    }
  }
  return { verdict: 'unreadable', reason: 'error' };
}

/** Run the pass over a sweep's stored runs. `fetchedAt` is today: pages change. */
export async function runSourceCoverage(
  runs: SweepRunResult[], domain: string, brand: string | null | undefined, ownedDomains: string[] = [],
): Promise<SourceCoverage> {
  const plan = planSourceCoverage(runs, domain, ownedDomains);
  const matchers = brandMatchers(brand, domain);
  const hostInfo = new Map(plan.recurring.map((h) => [h.host, h]));
  const robotsCache = new Map<string, Promise<{ allow: string[]; disallow: string[] } | null>>();
  const rows: CoverageRow[] = new Array(plan.pages.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, plan.pages.length) }, async () => {
    while (next < plan.pages.length) {
      const i = next++;
      const p = plan.pages[i];
      const h = hostInfo.get(p.host)!;
      const v = await checkPage(p.url, matchers, robotsCache);
      rows[i] = { host: p.host, timesCited: h.timesCited, engines: h.engines, url: p.url, ...v };
    }
  }));
  return { fetchedAt: new Date().toISOString(), distinctSites: plan.distinctSites, rows: rows.sort((a, b) => b.timesCited - a.timesCited || a.host.localeCompare(b.host)) };
}
