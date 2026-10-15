import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { processEvent, type WebhookDeps } from '../../api/webhook';
import { appGate, decide, APP_SLUG } from '../../api/_lib/stripeAppGate';

/** WO-PORTFOLIO-STRIPE-WEBHOOK-ISOLATION-001 — AEO Analyzers acts only on its own Stripe events. */
const ENV = { VITE_STRIPE_PRICE_ID_DAYPASS: 'price_aeo_daypass', VITE_STRIPE_PRICE_ID_PRO: 'price_aeo_pro', VITE_STRIPE_PRICE_ID_BUSINESS: 'price_aeo_business' };
const PRODUCT: Record<string, string> = { price_aeo_daypass: 'prod_aeo_daypass', price_aeo_pro: 'prod_aeo_pro', price_aeo_business: 'prod_aeo_business' };
const fakeStripe = (lineItems: Record<string, string[]> = {}) => ({
  prices: { retrieve: async (id: string) => ({ id, product: PRODUCT[id] }) },
  checkout: { sessions: { listLineItems: async (id: string) => {
    if (!(id in lineItems)) throw new Error('no such session');
    return { data: lineItems[id].map((p) => ({ price: { id: p, product: PRODUCT[p] || `prod_of_${p}` } })) };
  } } },
}) as any;

function harness(stripe = fakeStripe()) {
  const writes: { by: string; key: string; values: Record<string, unknown> }[] = [];
  const logs: string[] = [];
  const deps: WebhookDeps = {
    gate: (e) => appGate(e, stripe, ENV),
    updateUserById: async (id, values) => { writes.push({ by: 'id', key: id, values }); },
    updateUserByCustomer: async (c, values) => { writes.push({ by: 'customer', key: c, values }); },
    log: (l) => logs.push(l),
  };
  return { deps, writes, logs };
}
const ev = (type: string, object: any, id = 'evt_test') => ({ id, type, data: { object } }) as any;

// A real-shaped Macro Lens "Monthly Supporter" subscription event (another app, same account),
// carrying the same metadata keys other apps use.
const foreignSub = { id: 'sub_ml_1', object: 'subscription', status: 'active', customer: 'cus_shared', metadata: { userId: '11111111-2222-3333-4444-555555555555', planId: 'pro' },
  items: { object: 'list', data: [{ id: 'si_1', price: { id: 'price_macrolens_supporter', product: 'prod_macrolens', recurring: { interval: 'month' } } }] } };

describe('another app\'s events: no database write, no email, no entitlement', () => {
  it('a Macro Lens subscription.updated is ignored, with the log line', async () => {
    const h = harness();
    expect(await processEvent(ev('customer.subscription.updated', foreignSub, 'evt_ml_upd'), h.deps)).toBe('ignored');
    expect(h.writes).toEqual([]);
    expect(h.logs).toEqual(['ignored: not this app (event evt_ml_upd, price price_macrolens_supporter; price not in allowlist)']);
  });
  it('a Macro Lens subscription.deleted does not downgrade a shared customer', async () => {
    const h = harness();
    expect(await processEvent(ev('customer.subscription.deleted', { ...foreignSub, status: 'canceled' }), h.deps)).toBe('ignored');
    expect(h.writes).toEqual([]);
  });
  it('another app\'s checkout session is ignored (line items looked up, read-only)', async () => {
    const h = harness(fakeStripe({ cs_ml: ['price_macrolens_supporter'] }));
    expect(await processEvent(ev('checkout.session.completed', { id: 'cs_ml', object: 'checkout.session', status: 'complete', customer: 'cus_x', metadata: { userId: 'u', planId: 'pro' } }), h.deps)).toBe('ignored');
    expect(h.writes).toEqual([]);
  });
  it('an event tagged for another app is ignored even with our price', async () => {
    const h = harness();
    const sub = { ...foreignSub, metadata: { app: 'macro-lens', userId: 'u', planId: 'pro' }, items: { data: [{ price: { id: 'price_aeo_pro', product: 'prod_aeo_pro' } }] } };
    expect(await processEvent(ev('customer.subscription.updated', sub), h.deps)).toBe('ignored');
    expect(h.writes).toEqual([]);
  });
  it('a price that cannot be determined is ignored, never guessed', async () => {
    const h = harness(fakeStripe({}));
    expect(await processEvent(ev('checkout.session.completed', { id: 'cs_unknown', object: 'checkout.session', status: 'complete', metadata: { userId: 'u', planId: 'pro' } }), h.deps)).toBe('ignored');
    expect(h.writes).toEqual([]);
    expect(h.logs[0]).toMatch(/price unknown; price could not be determined/);
  });
});

describe('our own events still work end to end', () => {
  it('a tagged Pro checkout sets Pro', async () => {
    const h = harness();
    expect(await processEvent(ev('checkout.session.completed', { id: 'cs_aeo', object: 'checkout.session', status: 'complete', customer: 'cus_aeo', metadata: { app: APP_SLUG, userId: 'user-1', planId: 'pro' } }), h.deps)).toBe('applied');
    expect(h.writes).toHaveLength(1);
    expect(h.writes[0]).toMatchObject({ by: 'id', key: 'user-1', values: { subscription_status: 'Pro', stripe_customer_id: 'cus_aeo' } });
  });
  it('an untagged (pre-15-Oct) Day Pass checkout is recognized by its price and grants 24 hours', async () => {
    const h = harness(fakeStripe({ cs_dp: ['price_aeo_daypass'] }));
    expect(await processEvent(ev('checkout.session.completed', { id: 'cs_dp', object: 'checkout.session', status: 'complete', payment_status: 'paid', customer: 'cus_dp', metadata: { userId: 'user-2', planId: 'report' } }), h.deps)).toBe('applied');
    expect(Object.keys(h.writes[0].values)).toContain('report_pass_until');
  });
  it('a subscriber on a retired AEO price (same product) is still recognized, and cancels downgrade', async () => {
    const h = harness();
    const sub = { id: 'sub_aeo_old', object: 'subscription', status: 'canceled', customer: 'cus_old', metadata: { userId: 'user-3', planId: 'pro' }, items: { data: [{ price: { id: 'price_aeo_pro_2026_retired', product: 'prod_aeo_pro' } }] } };
    expect(await processEvent(ev('customer.subscription.deleted', sub), h.deps)).toBe('applied');
    expect(h.writes).toEqual([{ by: 'customer', key: 'cus_old', values: expect.objectContaining({ subscription_status: 'free' }) }]);
  });
  it('events we do not handle are left alone', async () => {
    const h = harness();
    expect(await processEvent(ev('invoice.paid', { object: 'invoice' }), h.deps)).toBe('unhandled');
    expect(h.writes).toEqual([]);
  });
});

describe('tagging and allowlist', () => {
  it('checkout sets metadata.app on the session, the subscription and the Day Pass payment', () => {
    const src = readFileSync('api/create-checkout-session.ts', 'utf8');
    expect(src).toContain('payment_intent_data: { metadata: { app: APP_SLUG, userId, planId } }');
    expect(src).toContain('subscription_data: { metadata: { app: APP_SLUG, userId, planId } }');
    expect(src).toContain('metadata: { app: APP_SLUG, userId, planId },');
    expect(APP_SLUG).toBe('aeo-analyzers');
  });
  it('decide: metadata first, then price, then product; empty is never ours', () => {
    const own = { prices: new Set(['price_a']), products: new Set(['prod_a']) };
    expect(decide({ metadataApp: null, priceIds: [], productIds: [] }, own).mine).toBe(false);
    expect(decide({ metadataApp: null, priceIds: ['price_a'], productIds: [] }, own).mine).toBe(true);
    expect(decide({ metadataApp: null, priceIds: ['price_z'], productIds: ['prod_a'] }, own).mine).toBe(true);
    expect(decide({ metadataApp: 'other', priceIds: ['price_a'], productIds: [] }, own).mine).toBe(false);
  });
  it('the audit mode is signed and read-only', () => {
    const src = readFileSync('api/create-checkout-session.ts', 'utf8');
    const audit = src.slice(src.indexOf("if (action === 'stripe-audit')"), src.indexOf('// --- Billing portal branch'));
    expect(audit).toContain("createHmac('sha256', svc)");
    expect(audit).toContain('timingSafeEqual');
    expect(audit).not.toMatch(/stripe\.[a-zA-Z.]+\.(create|update|del|cancel|pay|void)\(/);
    expect(audit).toMatch(/stripe\.webhookEndpoints\.list\(/);
  });
});
