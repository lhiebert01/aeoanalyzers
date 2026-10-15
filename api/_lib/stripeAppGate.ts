// WO-PORTFOLIO-STRIPE-WEBHOOK-ISOLATION-001 — act only on AEO Analyzers' own Stripe events.
//
// Several PIGENAI apps share one Stripe account, and Stripe sends every event to every endpoint.
// Before this handler touches anything, an event must be shown to be ours:
//   1. `metadata.app` on the session or subscription (set by our checkout since 15 Oct 2026):
//      "aeo-analyzers" is ours; any other value is not.
//   2. Without it, the event's price IDs — or those prices' products — against our own allowlist:
//      the price IDs in our env vars (VITE_STRIPE_PRICE_ID_*), and the products those prices belong
//      to, so subscribers still on a retired AEO price (same product) are recognized.
//   3. A price that cannot be determined is not ours. Never guess.
// No match: the caller returns 200 to Stripe, logs `ignored: not this app (...)` and does nothing.
import type Stripe from 'stripe';

export const APP_SLUG = 'aeo-analyzers';
const PRICE_ENV = ['VITE_STRIPE_PRICE_ID_DAYPASS', 'VITE_STRIPE_PRICE_ID_PRO', 'VITE_STRIPE_PRICE_ID_BUSINESS', 'VITE_STRIPE_PRICE_ID_REPORT'];

export function ownPriceIds(env: Record<string, string | undefined> = process.env): string[] {
  return [...new Set(PRICE_ENV.map((k) => (env[k] || '').trim()).filter((v) => v.startsWith('price_')))];
}

export interface EventParts { metadataApp: string | null; priceIds: string[]; productIds: string[] }
export interface GateDecision extends EventParts { mine: boolean; reason: string }

/** The decision, from the event's parts and our allowlist. Pure. */
export function decide(parts: EventParts, own: { prices: Set<string>; products: Set<string> }): GateDecision {
  if (parts.metadataApp) {
    return parts.metadataApp === APP_SLUG
      ? { ...parts, mine: true, reason: `metadata.app=${parts.metadataApp}` }
      : { ...parts, mine: false, reason: `metadata.app=${parts.metadataApp}` };
  }
  if (!parts.priceIds.length && !parts.productIds.length) return { ...parts, mine: false, reason: 'price could not be determined' };
  if (parts.priceIds.some((p) => own.prices.has(p))) return { ...parts, mine: true, reason: 'own price' };
  if (parts.productIds.some((p) => own.products.has(p))) return { ...parts, mine: true, reason: 'own product' };
  return { ...parts, mine: false, reason: 'price not in allowlist' };
}

const idOf = (v: unknown): string | null => (typeof v === 'string' ? v : v && typeof v === 'object' && typeof (v as any).id === 'string' ? (v as any).id : null);

/** Price and product IDs carried on the event object itself (subscriptions, invoices). */
export function partsFromObject(obj: any): EventParts {
  const priceIds: string[] = [], productIds: string[] = [];
  const add = (price: any) => {
    const pid = idOf(price); if (pid) priceIds.push(pid);
    const prod = idOf(price?.product); if (prod) productIds.push(prod);
  };
  for (const it of obj?.items?.data || []) add(it?.price);          // subscription
  for (const ln of obj?.lines?.data || []) add(ln?.price ?? ln?.pricing?.price_details?.price); // invoice
  if (obj?.plan) add(obj.plan);                                       // legacy subscription shape
  const app = obj?.metadata?.app ?? obj?.subscription_details?.metadata?.app ?? null;
  return { metadataApp: typeof app === 'string' && app ? app : null, priceIds: [...new Set(priceIds)], productIds: [...new Set(productIds)] };
}

let productCache: { key: string; products: Set<string> } | null = null;

/** Our products: the products of our own env prices (one lookup per price per warm instance). */
export async function ownProducts(stripe: Pick<Stripe, 'prices'>, prices: string[]): Promise<Set<string>> {
  const key = prices.join(',');
  if (productCache?.key === key) return productCache.products;
  const products = new Set<string>();
  for (const p of prices) {
    try { const pr = await stripe.prices.retrieve(p); const prod = idOf(pr.product); if (prod) products.add(prod); } catch { /* a missing price adds nothing */ }
  }
  productCache = { key, products };
  return products;
}

/** Decide for a Stripe event. Checkout sessions do not carry their line items in the event, so
 *  they are listed (read-only) when the session has no `metadata.app`. */
export async function appGate(event: Stripe.Event, stripe: Pick<Stripe, 'prices' | 'checkout'>, env: Record<string, string | undefined> = process.env): Promise<GateDecision> {
  const obj: any = event.data.object;
  let parts = partsFromObject(obj);
  if (!parts.metadataApp && obj?.object === 'checkout.session' && obj.id) {
    try {
      const items = await stripe.checkout.sessions.listLineItems(obj.id, { limit: 20 });
      parts = { ...parts, priceIds: items.data.map((i: any) => idOf(i.price)).filter(Boolean) as string[], productIds: items.data.map((i: any) => idOf(i.price?.product)).filter(Boolean) as string[] };
    } catch { /* undeterminable: decide() ignores it */ }
  }
  const prices = ownPriceIds(env);
  const products = parts.metadataApp ? new Set<string>() : await ownProducts(stripe, prices);
  return decide(parts, { prices: new Set(prices), products });
}

export function ignoredLine(event: { id: string }, d: GateDecision): string {
  return `ignored: not this app (event ${event.id}, price ${d.priceIds.join(',') || 'unknown'}; ${d.reason})`;
}
