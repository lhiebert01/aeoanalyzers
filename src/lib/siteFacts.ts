// WO-AEO-DOGFOOD-FIXES-010 A — prices, plan allowances and retired names as checkable facts.
//
// The 15 Oct 2026 dogfood: an engine quoted a buyer the prices from before 14 Oct, two days after
// they changed, and the report still said "described accurately 10 of 10", because the accuracy check covered only the brand name and the founder.
// This module reads what a site publishes about its own prices and free allowance (its JSON-LD
// and its pricing page), and reads price claims out of an engine's answer as whole claims
// ("$10/mo Starter", never the fragment "mo Starter"). Deterministic: no LLM judges anything here.
//
// Import-free on purpose: the serverless sweep route and the client both use it.

export interface PricePoint {
  amount: number;
  /** The price as the site writes it ("$149/mo", "$29 / 24h"), for side-by-side display. */
  label: string;
}

export interface PriceClaim {
  amount: number;
  /** The whole claim as the engine wrote it: "$10/mo Starter", "$5 Day Pass". */
  claim: string;
}

const AMOUNT = String.raw`\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?`;
const PERIOD = String.raw`(?:\s*(?:\/|per)\s*(?:mo|month|yr|year|day|24\s?h|24\s?hours|user|seat))?`;
const toAmount = (whole: string, cents?: string) => Number(whole.replace(/,/g, '')) + (cents ? Number(cents.padEnd(2, '0')) / 100 : 0);
const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Every price an answer states, as whole claims: the amount, an optional period, and up to two
 *  capitalised words that follow it (the plan name). */
export function extractPriceClaims(text: string): PriceClaim[] {
  const out: PriceClaim[] = [];
  // Not a price: "$5 million", "$2.5B" (funding, revenue, valuation).
  const rx = new RegExp(`${AMOUNT}(?![.,]?\\d)(?!\\s*(?:[MBKmbk]\\b|million|billion|thousand|k\\b))${PERIOD}(?:\\s+(?!(?:and|or|for|per|a|an|the)\\b)([A-Z][\\w-]*(?:\\s+[A-Z][\\w-]*)?))?`, 'g');
  for (const m of String(text || '').replace(/\*\*|__/g, '').matchAll(rx)) {
    out.push({ amount: toAmount(m[1], m[2]), claim: squash(m[0]).replace(/[.,;:]+$/, '') });
  }
  return out;
}

/** The sentences of an answer that talk about the company itself: they name the brand, or open
 *  with "It"/"Its"/"They" carrying the subject forward. A price in a sentence about a competitor
 *  ("a rival starts at $499") is not a claim about the customer. */
export function sentencesAboutBrand(text: string, brand: string | null | undefined): string[] {
  const sentences = String(text || '').replace(/\*\*|__/g, '').split(/(?<=[.!?])\s+|\n+/);
  const b = (brand || '').toLowerCase();
  return sentences.filter((x) => (b && x.toLowerCase().includes(b)) || /^\s*(?:it|its|they|their)\b/i.test(x));
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/** "3 free checks", "five free analyses": the free allowance a text states. "a free check" states
 *  no number and returns null. */
export function extractFreeAllowance(text: string): { count: number; claim: string } | null {
  const m = String(text || '').match(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+free\s+(checks?|analys[ie]s|scans?|audits?|reports?)\b/i);
  if (!m) return null;
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1].toLowerCase()];
  return n ? { count: n, claim: squash(m[0]) } : null;
}

function visibleText(html: string): string {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/** The prices a site publishes about itself: Offer / AggregateOffer amounts in its JSON-LD, plus
 *  every price printed on its pricing page. */
export function publishedPrices(jsonLdNodes: any[], pricingHtml?: string | null): PricePoint[] {
  const seen = new Map<number, PricePoint>();
  const add = (amount: number, label: string) => {
    if (!Number.isFinite(amount)) return;
    const cur = seen.get(amount);
    if (!cur || (label.length > cur.label.length && label.length < 24)) seen.set(amount, { amount, label });
  };
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (/Offer/i.test(String(n['@type'] || ''))) {
      for (const k of ['price', 'lowPrice', 'highPrice']) {
        const v = n[k];
        if (v !== undefined && v !== null && String(v).trim() !== '' && !Number.isNaN(Number(v))) add(Number(v), `$${Number(v)}`);
      }
    }
    for (const v of Object.values(n)) if (v && typeof v === 'object') walk(v);
  };
  walk(jsonLdNodes);
  if (pricingHtml) {
    const rx = new RegExp(`${AMOUNT}${PERIOD}`, 'g');
    for (const m of visibleText(pricingHtml).matchAll(rx)) add(toAmount(m[1], m[2]), squash(m[0]).replace(/\s*\/\s*/g, '/'));
  }
  return [...seen.values()].sort((a, b) => a.amount - b.amount);
}

/** The free allowance a site's pricing page states, if it states one. */
export function publishedFreeAllowance(pricingHtml?: string | null): number | null {
  return pricingHtml ? extractFreeAllowance(visibleText(pricingHtml))?.count ?? null : null;
}

// ─── Our own site's dated record ───────────────────────────────────────────────────────────
// For aeoanalyzers.com only. Names the product no longer uses (an engine repeating one is
// describing a retired product), and the prices in force before 14 Oct 2026 03:15 UTC, when the
// pricing change went live (dpl_gSxxkcmcT7nmkw9ygXZ4iJ2VCUS9). Stored sweeps were snapshotted
// before prices were part of the record, so a re-score uses the prices live at the sweep's own
// time: an engine that quoted the old Pro price on 13 Oct was quoting the site of that day.
// Prices and plan names below are as of their dates; current pricing is at https://aeoanalyzers.com/pricing.

export const OWN_DOMAIN = 'aeoanalyzers.com';
/** A name counts as retired only from the moment the site itself stopped saying it: an engine
 *  repeating what the site still served is not contradicted by the site. "AI Simulation Engine"
 *  lingered in public/manifest.json until WO-010 removed it. */
export const OWN_RETIRED_NAMES: { name: string; since: string }[] = [
  { name: 'AI Visibility Executive Report', since: '2026-10-14T04:21:35Z' }, // b26a808, dpl_3vSHkwe1g5JdZNG9PD6D7VaibDvS
  { name: 'Executive Report', since: '2026-10-14T04:21:35Z' },
  { name: 'AI Simulation Engine', since: '2026-10-15T06:14:00Z' },          // WO-010 deploy (manifest.json)
];
const PRICE_CHANGE_AT = Date.parse('2026-10-14T03:15:35Z');   // dpl_gSxxkcmcT7nmkw9ygXZ4iJ2VCUS9
const FREE_CHECKS_AT = Date.parse('2026-10-15T04:44:00Z');    // "3 free checks" on /pricing, dpl_EhCzbEmMRwAPY1T9VLGDsUqYCiDj
const OWN_PRICES_BEFORE: PricePoint[] = [
  { amount: 0, label: 'Free' }, { amount: 24, label: '$24 Day Pass' }, { amount: 49, label: '$49/mo Pro' }, { amount: 199, label: '$199/mo Business' },
];
const OWN_PRICES_AFTER: PricePoint[] = [
  { amount: 0, label: 'Free' }, { amount: 29, label: '$29 Day Pass' }, { amount: 149, label: '$149/mo Pro Optimizer' }, { amount: 599, label: '$599/mo Business Authority' },
];

const bareDomain = (d: string) => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

/** Our own site's record at a moment in time, or null for any other domain. */
export function ownSiteRecordAt(domain: string, at: Date | string | number): { prices: PricePoint[]; freeAllowance: number | null; retiredNames: string[]; source: string } | null {
  if (bareDomain(domain) !== OWN_DOMAIN) return null;
  const t = new Date(at).getTime();
  if (!Number.isFinite(t)) return null;
  const after = t >= PRICE_CHANGE_AT;
  return {
    prices: after ? OWN_PRICES_AFTER : OWN_PRICES_BEFORE,
    freeAllowance: t >= FREE_CHECKS_AT ? 3 : null,
    retiredNames: OWN_RETIRED_NAMES.filter((r) => t >= Date.parse(r.since)).map((r) => r.name),
    source: after ? 'aeoanalyzers.com/pricing from 14 Oct 2026' : 'aeoanalyzers.com/pricing before 14 Oct 2026',
  };
}
