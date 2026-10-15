// WO-2/WO-5 — Truth Record: the client's canonical facts, derived from their own
// structured data (JSON-LD), llms.txt, and meta tags. This is ground truth: what
// answer engines SHOULD say. WO-2 (fidelity) diffs engine answers against it;
// WO-5 (drift) diffs the live site against an approved copy of it.
//
// Deterministic — parses the site's own first-party signals, never an LLM.

import { publishedPrices, publishedFreeAllowance, ownSiteRecordAt, type PricePoint } from './siteFacts.js';

export interface TruthRecord {
  brandName: string | null;
  /** Canonical founder/creator name(s) — the fact answer engines most often get
   *  wrong (see the Jesper Nissen misattribution). */
  founders: string[];
  /** Controlled-profile URLs the entity has declared. */
  sameAs: string[];
  /** Free-form canonical facts { key, value } for the drill-down + drift diff. */
  facts: { key: string; value: string }[];
  /** WO-INTEGRITY-002 B5: what schema the page ALREADY serves, so the fix prescribes
   *  only the delta instead of a fresh graph. */
  hasOrganization?: boolean;
  /** The served Organization/WebSite node already carries a stable @id. */
  hasOrgId?: boolean;
  /** The served entity node already carries a disambiguatingDescription. */
  hasDisambiguation?: boolean;
  /** WO-010 A: the prices the site publishes (its pricing page, and individual Offer prices in its
   *  JSON-LD). Present only when the set is complete enough to judge a quoted price against it:
   *  an AggregateOffer's low/high bounds alone are not. */
  prices?: PricePoint[];
  /** The free allowance the pricing page states ("3 free checks"), when it states one. */
  freeAllowance?: number | null;
  /** Product names the site no longer uses (our own domain only; see siteFacts.ts). */
  retiredNames?: string[];
  /** Where prices / allowance came from, shown beside a contradicted claim. */
  pricesSource?: string;
}

/** Extract and parse every <script type="application/ld+json"> block, flattening
 *  any @graph. Malformed blocks are skipped. */
export function extractJsonLdNodes(html: string): any[] {
  const nodes: any[] = [];
  const rx = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(String(html || '')))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        if (item && Array.isArray(item['@graph'])) nodes.push(...item['@graph']);
        else if (item) nodes.push(item);
      }
    } catch {
      /* skip malformed JSON-LD */
    }
  }
  return nodes;
}

function metaContent(html: string, key: string): string | null {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = String(html || '').match(new RegExp(`<meta[^>]+(?:name|property)=["']${esc}["'][^>]*>`, 'i'));
  if (!tag) return null;
  const c = tag[0].match(/content=["']([^"']*)["']/i);
  return c ? c[1].trim() : null;
}

const FOUNDER_TITLE = /founder|creator|co-?founder|owner|principal/i;

/** Build the truth record from a page's HTML plus its llms.txt (if any). */
export function extractTruthRecord(html: string, llmsTxt?: string | null, pricingHtml?: string | null): TruthRecord {
  const h = String(html || '');
  const nodes = extractJsonLdNodes(h);

  // --- Brand name ---
  const orgNode = nodes.find((n) => /Organization|SoftwareApplication|WebSite|LocalBusiness/i.test(String(n?.['@type'])));
  const brandName =
    metaContent(h, 'og:site_name') ||
    (orgNode?.name && String(orgNode.name)) ||
    (nodes.find((n) => n?.name)?.name && String(nodes.find((n) => n?.name).name)) ||
    (h.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.split(/[|–—·:]|\s-\s/)[0]?.trim() ?? null);

  // --- Founders (canonical) ---
  const founders = new Set<string>();
  for (const n of nodes) {
    const type = String(n?.['@type'] || '');
    if (/Person/i.test(type) && n?.name && FOUNDER_TITLE.test(String(n?.jobTitle || ''))) {
      founders.add(String(n.name).trim());
    }
  }
  // Organization.founder / .creator / .author references resolved by name.
  for (const n of nodes) {
    for (const key of ['founder', 'creator', 'author']) {
      const ref = n?.[key];
      const refs = Array.isArray(ref) ? ref : ref ? [ref] : [];
      for (const r of refs) {
        if (r?.name) founders.add(String(r.name).trim());
      }
    }
  }
  // llms.txt "Founder: Name" and author meta.
  const llmsFounder = String(llmsTxt || '').match(/^\s*founder[s]?\s*:\s*([^,\n(]+)/im);
  if (llmsFounder) founders.add(llmsFounder[1].trim());
  const authorMeta = metaContent(h, 'author');
  if (authorMeta) founders.add(authorMeta);

  // --- sameAs ---
  const sameAs = new Set<string>();
  for (const n of nodes) {
    const sa = n?.sameAs;
    const arr = Array.isArray(sa) ? sa : sa ? [sa] : [];
    for (const u of arr) if (typeof u === 'string') sameAs.add(u);
  }

  // --- Canonical facts (for drill-down + drift) ---
  const facts: { key: string; value: string }[] = [];
  if (brandName) facts.push({ key: 'name', value: brandName });
  for (const f of founders) facts.push({ key: 'founder', value: f });
  const desc = metaContent(h, 'description') || (orgNode?.description && String(orgNode.description));
  if (desc) facts.push({ key: 'description', value: String(desc) });

  // WO-INTEGRITY-002 B5: what the page already serves — the org node, its @id, and a
  // disambiguatingDescription — so the remediation prescribes only what's missing.
  const orgLike = nodes.find((n) => /Organization|SoftwareApplication|LocalBusiness/i.test(String(n?.['@type'])));
  const hasOrganization = !!orgLike;
  const hasOrgId = !!(orgLike && orgLike['@id']);
  const hasDisambiguation = nodes.some((n) => !!n?.disambiguatingDescription);

  // WO-010 A: published prices. Judged only when the set is complete: the pricing page was read
  // and printed prices, or the JSON-LD carries individual Offer prices (not just aggregate bounds).
  const hasIndividualOffer = JSON.stringify(nodes).includes('"price"');
  const pagePrices = pricingHtml ? publishedPrices([], pricingHtml) : [];
  const prices = pagePrices.length || hasIndividualOffer ? publishedPrices(nodes, pricingHtml) : [];
  const freeAllowance = publishedFreeAllowance(pricingHtml);

  return {
    ...(prices.length ? { prices, pricesSource: pagePrices.length ? 'your pricing page' : 'your structured data' } : {}),
    ...(freeAllowance ? { freeAllowance } : {}),
    brandName: brandName || null,
    founders: [...founders].filter(Boolean),
    sameAs: [...sameAs],
    facts,
    hasOrganization,
    hasOrgId,
    hasDisambiguation,
  };
}

/** WO-010 A: add what the site published at the sweep's own time and the snapshot did not carry.
 *  Snapshots stored before 15 Oct 2026 hold no prices; for our own domain the dated record in
 *  siteFacts.ts supplies the prices, free allowance and retired names in force at `at`, so a
 *  re-score judges each answer against the site of its own day. Any other domain is returned
 *  unchanged: we never guess a customer's past prices. */
export function withSiteRecord(truth: TruthRecord | null | undefined, domain: string, at: Date | string | number): TruthRecord | null {
  if (!truth) return null;
  const own = ownSiteRecordAt(domain, at);
  if (!own) return truth;
  return {
    ...truth,
    ...((truth.prices || []).length ? {} : { prices: own.prices, pricesSource: own.source }),
    freeAllowance: truth.freeAllowance ?? own.freeAllowance,
    retiredNames: own.retiredNames,
  };
}
