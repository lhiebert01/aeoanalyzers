// WO-QA-003 B2 — Entity-linking failure detection.
//
// Distinct from content drift (B1, fidelity.ts): there the engine names YOU but
// asserts a false fact. Here the engine cites the WRONG ENTITY entirely — it can't
// resolve "AEO Analyzers" against a crowded namespace, so it grabs:
//   (a) a Wikipedia acronym / disambiguation page (AEA, AER, AE, AEi Systems …),
//   (b) a finance / stock-ticker page for a colliding symbol (ticker AEO), or
//   (c) a near-name domain that isn't you (aeoanalytics.com, aeoaudittool.com …).
// This is what drags Owned Citation Rate down and what the namespace-collision
// remediation (atomic unaffiliation sentence + @id entity graph) is meant to fix.
//
// Grounded + deterministic (no LLM): every flag is an actual cited SOURCE url from
// a branded run. Dogfood evidence: Claude cited en.wikipedia.org/wiki/AEA and
// finance pages for ticker AEO; Perplexity blended in aeoanalytics.com. The
// correct Perplexity "sole creator" answer, whose only source is the real site,
// produces zero flags (positive control).

import { normalizeDomain } from './citationSweep';

export type EntityLinkKind = 'wikipedia-collision' | 'ticker-collision' | 'near-name-domain';

export interface EntityLinkingFlag {
  kind: EntityLinkKind;
  /** The offending cited source URL. */
  source: string;
  /** The entity the engine confused you with (a Wikipedia title, a ticker host, a near-name domain). */
  collidingEntity: string;
  detail: string;
}

export interface EntityLinkingReport {
  flags: EntityLinkingFlag[];
  /** Deduped colliding-entity labels for the "engines are confusing you with: …" callout. */
  collisions: string[];
}

// Finance / market-data hosts. A solo SaaS cited via one of these on a ticker path
// is almost certainly a stock-symbol collision, not a real citation.
const FINANCE_HOSTS = [
  'finance.yahoo.com', 'yahoo.com', 'benzinga.com', 'marketwatch.com', 'bloomberg.com',
  'nasdaq.com', 'stocktwits.com', 'tradingview.com', 'investing.com', 'seekingalpha.com',
  'fool.com', 'tipranks.com', 'wallstreetzen.com', 'stockanalysis.com', 'morningstar.com',
];
const TICKER_PATH = /\/(quote|quotes|symbol|stocks?|ticker|price-targets?)\//i;

// Hosts that are never "you" and never a confusable entity — don't near-name-flag them.
const SAFE_HOSTS = new Set([
  'linkedin.com', 'youtube.com', 'facebook.com', 'twitter.com', 'x.com', 'github.com',
  'medium.com', 'reddit.com', 'crunchbase.com', 'g2.com', 'producthunt.com', 'betalist.com',
]);

/** Parse a URL into a lowercased host + path, tolerant of bare hosts. */
function parseUrl(u: string): { host: string; path: string; slug: string } {
  const raw = String(u || '').trim();
  let host = '', path = '';
  try {
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    path = parsed.pathname || '';
  } catch {
    host = normalizeDomain(raw);
    path = raw.slice(raw.indexOf(host) + host.length);
  }
  const segs = path.split('/').filter(Boolean);
  return { host, path, slug: (segs[segs.length - 1] || '').toLowerCase() };
}

/** Collapse a host to its registrable-ish domain (last two labels). */
function registrable(host: string): string {
  const parts = host.split('.').filter(Boolean);
  return parts.length <= 2 ? parts.join('.') : parts.slice(-2).join('.');
}

/** Levenshtein edit distance (small strings). */
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr;
  }
  return prev[n];
}

const alnum = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

interface BrandKeys {
  ownHost: string;      // registrable own domain, e.g. aeoanalyzers.com
  root: string;         // own domain root, e.g. aeoanalyzers
  acronyms: string[];   // short all-caps tokens, e.g. ['aeo']
}

function brandKeys(client: { domain: string; brand?: string }): BrandKeys {
  const ownHost = registrable(normalizeDomain(client.domain));
  const root = ownHost.split('.')[0] || '';
  const acronyms = new Set<string>();
  for (const m of String(client.brand || '').matchAll(/\b[A-Z]{2,6}\b/g)) acronyms.add(m[0].toLowerCase());
  // Fall back to the leading 3 letters of the domain root (the acronym is often a prefix).
  if (!acronyms.size && root.length >= 3) acronyms.add(root.slice(0, 3));
  return { ownHost, root, acronyms: [...acronyms] };
}

/** A Wikipedia article slug that is an acronym/near-name collision with the brand. */
function isWikiCollision(slug: string, keys: BrandKeys): boolean {
  if (!slug) return false;
  if (/disambiguation/.test(slug)) return true;
  const head = alnum(slug.split('_')[0]); // "aei_systems" → "aei"
  if (!head || head.length > 6) return false;
  return keys.acronyms.some((k) => {
    const d = editDistance(head, k);
    return d <= 1 || (d <= 2 && head.slice(0, 2) === k.slice(0, 2));
  });
}

/** A non-you domain that is confusably close to the brand (near-name impostor). */
function isNearNameDomain(host: string, keys: BrandKeys): boolean {
  const reg = registrable(host);
  if (reg === keys.ownHost) return false;
  if (SAFE_HOSTS.has(reg)) return false;
  const compact = alnum(host);
  // Contains a brand acronym token (≥3 chars) as a substring — the "aeo…" impostors.
  if (keys.acronyms.some((k) => k.length >= 3 && compact.includes(k))) return true;
  // Or the registrable root is edit-close to the brand root (aeoanalytics≈aeoanalyzers).
  const regRoot = reg.split('.')[0] || '';
  if (regRoot && keys.root && Math.abs(regRoot.length - keys.root.length) <= 3) {
    if (editDistance(regRoot, keys.root) <= 3 && regRoot.slice(0, 4) === keys.root.slice(0, 4)) return true;
  }
  return false;
}

/**
 * Scan the SOURCES of branded runs for entity-linking failures. `truth.sameAs` are
 * the client's declared controlled profiles — never flagged as near-name.
 */
export function detectEntityLinkingFailures(
  brandedRuns: { sources?: string[] }[],
  client: { domain: string; brand?: string },
  truth?: { sameAs?: string[] } | null
): EntityLinkingReport {
  const keys = brandKeys(client);
  const declared = new Set((truth?.sameAs || []).map((u) => registrable(parseUrl(u).host)));
  const flags: EntityLinkingFlag[] = [];
  const seen = new Set<string>();

  for (const run of brandedRuns) {
    for (const url of run.sources || []) {
      const { host, slug } = parseUrl(url);
      if (!host) continue;
      const reg = registrable(host);
      if (reg === keys.ownHost || declared.has(reg)) continue; // it's really you

      let flag: EntityLinkingFlag | null = null;
      if (reg.endsWith('wikipedia.org') && isWikiCollision(slug, keys)) {
        flag = { kind: 'wikipedia-collision', source: url, collidingEntity: `Wikipedia: ${slug.replace(/_/g, ' ')}`,
          detail: `An engine cited a Wikipedia acronym/disambiguation page ("${slug.replace(/_/g, ' ')}") as if it were you.` };
      } else if (FINANCE_HOSTS.includes(reg) && TICKER_PATH.test(url)) {
        flag = { kind: 'ticker-collision', source: url, collidingEntity: `${reg} (stock-ticker page)`,
          detail: `An engine cited a finance/stock-ticker page (${reg}) — a colliding ticker symbol, not your company.` };
      } else if (isNearNameDomain(host, keys)) {
        flag = { kind: 'near-name-domain', source: url, collidingEntity: host,
          detail: `An engine cited "${host}", a near-name domain that is not your site.` };
      }

      if (flag) {
        const key = `${flag.kind}|${flag.collidingEntity}`;
        if (!seen.has(key)) { seen.add(key); flags.push(flag); }
      }
    }
  }

  return { flags, collisions: [...new Set(flags.map((f) => f.collidingEntity))] };
}
