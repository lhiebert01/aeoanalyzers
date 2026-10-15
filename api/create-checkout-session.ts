import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { APP_SLUG, ownPriceIds, partsFromObject, decide } from './_lib/stripeAppGate.js';

// Merged Stripe endpoint: checkout (default) + billing portal ({ action:'portal' }).
// Kept as ONE serverless function so the deployment stays within the Vercel Hobby
// 12-function cap (folding the former create-portal-session.ts in here freed the
// slot for api/llm-generate.ts). Both branches are POST-only and were previously
// called only from src/components/Payments.tsx.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const { action, planId, userId, email, promoCode } = req.body || {};

  // --- Read-only Stripe audit (WO-PORTFOLIO-STRIPE-WEBHOOK-ISOLATION-001 §3) ---
  // Lists the account's webhook endpoints and the recent subscription/checkout events with the
  // app gate's decision for each. Changes nothing in Stripe. Callable only with a 5-minute HMAC
  // of the server's Supabase service key (held by the operator), never from the app.
  if (action === 'stripe-audit') {
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const given = String(req.headers['x-aeo-audit'] || '');
    const bucket = Math.floor(Date.now() / 300_000);
    const ok = !!svc && !!stripeKey && [bucket, bucket - 1].some((b) => {
      const want = createHmac('sha256', svc).update(`stripe-audit:${b}`).digest('hex');
      return given.length === want.length && timingSafeEqual(Buffer.from(given), Buffer.from(want));
    });
    if (!ok) return res.status(404).json({ error: 'Not found' });
    const stripe = new Stripe(stripeKey!);
    try {
      const endpoints = (await stripe.webhookEndpoints.list({ limit: 100 })).data.map((w) => ({ url: w.url, status: w.status, events: w.enabled_events, created: w.created }));
      const products = new Map<string, string>();
      for await (const pr of stripe.products.list({ limit: 100 })) products.set(pr.id, pr.name);
      for await (const pr of stripe.products.list({ limit: 100, active: false })) products.set(pr.id, `${pr.name} (archived)`);
      const prices: any[] = [];
      for (const active of [true, false]) for await (const pr of stripe.prices.list({ limit: 100, active })) prices.push({ id: pr.id, product: typeof pr.product === 'string' ? pr.product : pr.product.id, productName: products.get(typeof pr.product === 'string' ? pr.product : pr.product.id) || null, amount: pr.unit_amount, interval: pr.recurring?.interval || 'one-time', active: pr.active });
      const own = new Set(ownPriceIds()), ownProd = new Set(prices.filter((p) => own.has(p.id)).map((p) => p.product));
      const since = Math.floor(Date.now() / 1000) - 90 * 86400;
      const events: any[] = []; const emails = new Map<string, string | null>();
      for await (const e of stripe.events.list({ limit: 100, created: { gte: since }, types: ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'] })) {
        if (events.length >= 1500) break;
        const o: any = e.data.object;
        let parts = partsFromObject(o);
        if (!parts.metadataApp && o.object === 'checkout.session') {
          try { const li = await stripe.checkout.sessions.listLineItems(o.id, { limit: 20 }); parts = { ...parts, priceIds: li.data.map((i: any) => i.price?.id).filter(Boolean), productIds: li.data.map((i: any) => (typeof i.price?.product === 'string' ? i.price.product : i.price?.product?.id)).filter(Boolean) }; } catch { /* undeterminable */ }
        }
        const cust = typeof o.customer === 'string' ? o.customer : o.customer?.id || null;
        let email: string | null = o.customer_details?.email || o.customer_email || null;
        if (!email && cust) {
          if (!emails.has(cust) && emails.size < 400) { try { const c: any = await stripe.customers.retrieve(cust); emails.set(cust, c?.deleted ? null : c?.email || null); } catch { emails.set(cust, null); } }
          email = emails.get(cust) ?? null;
        }
        events.push({ id: e.id, type: e.type, created: e.created, object: o.id, customer: cust, email, metadata: o.metadata || {}, successUrl: o.success_url || null, status: o.status || null, decision: decide(parts, { prices: own, products: ownProd }) });
      }
      return res.json({ endpoints, prices, ownPrices: [...own], ownProducts: [...ownProd], events, oldestEventReturned: events.length ? Math.min(...events.map((e) => e.created)) : null });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- Billing portal branch (was create-portal-session.ts) ---
  if (action === 'portal') {
    if (!stripeKey) {
      const appUrl = process.env.VITE_APP_URL || 'https://aeoanalyzers.com';
      return res.json({ url: `${appUrl}/?portal=mock` });
    }
    const stripe = new Stripe(stripeKey);
    try {
      const customers = await stripe.customers.list({ email, limit: 1 });
      const customerId = customers.data.length > 0 ? customers.data[0].id : null;
      if (!customerId) {
        return res.status(404).json({ error: 'No active subscription found for this email.' });
      }
      const appUrl = process.env.VITE_APP_URL || 'https://aeoanalyzers.com';
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}/payments`,
      });
      return res.json({ url: session.url });
    } catch (error: any) {
      console.error('Portal Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // --- Checkout branch (default) ---
  if (!stripeKey) {
    // Fallback for demo if no key is set
    console.warn('STRIPE_SECRET_KEY is missing. Using mock response.');
    return res.json({
      sessionId: `mock_session_${Math.random().toString(36).substring(7)}`,
      url: `${process.env.VITE_APP_URL || 'https://aeoanalyzers.com'}/?session_id=mock_success`,
    });
  }

  const stripe = new Stripe(stripeKey);

  try {
    // 'report' is the one-time Day Pass (24h access); everything else is a subscription.
    const isDayPass = planId === 'report';

    const priceId = isDayPass
      ? process.env.VITE_STRIPE_PRICE_ID_DAYPASS
      : planId === 'business'
        ? process.env.VITE_STRIPE_PRICE_ID_BUSINESS
        : process.env.VITE_STRIPE_PRICE_ID_PRO;

    if (!priceId) {
      throw new Error(`Price ID for plan '${planId}' is not configured.`);
    }

    // Normalize the base URL so a misconfigured VITE_APP_URL (bare domain, trailing
    // slash, stray whitespace) can't make Stripe reject success_url/cancel_url with
    // "Not a valid URL" — which silently breaks ALL checkout (Day Pass + subs).
    let appUrl = (process.env.VITE_APP_URL || 'https://www.aeoanalyzers.com').trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(appUrl)) appUrl = `https://${appUrl}`;

    // A promotion code carried in the app's link (/pricing?promo=CODE, founder 15 Oct 2026) is
    // applied for the customer, so they never type it. Stripe takes either a pre-applied discount
    // or the entry field, not both; an unknown, inactive or non-applicable code falls back to the
    // entry field rather than failing the checkout.
    const code = typeof promoCode === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(promoCode.trim()) ? promoCode.trim() : '';
    let promotionCodeId: string | null = null;
    if (code) {
      try {
        const found = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
        promotionCodeId = found.data[0]?.id ?? null;
      } catch { promotionCodeId = null; }
    }
    const create = (applyCode: boolean) => stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      // Otherwise a code created in the Stripe dashboard (e.g. the 100% test coupon) can be entered at checkout.
      ...(applyCode && promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : { allow_promotion_codes: true }),
      mode: isDayPass ? 'payment' : 'subscription',
      success_url: `${appUrl}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payments`,
      customer_email: email,
      // subscription_data is only valid in subscription mode; use payment_intent_data for one-time.
      // WO-PORTFOLIO-STRIPE-WEBHOOK-ISOLATION-001: every object this checkout creates names its app,
      // so the shared account's other apps can ignore it and our webhook can recognize it.
      ...(isDayPass
        ? { payment_intent_data: { metadata: { app: APP_SLUG, userId, planId } } }
        : { subscription_data: { metadata: { app: APP_SLUG, userId, planId } } }),
      metadata: { app: APP_SLUG, userId, planId },
    });
    let session;
    try {
      session = await create(true);
    } catch (err) {
      if (!promotionCodeId) throw err;
      session = await create(false); // the code does not apply to this plan: offer the entry field instead
    }

    // priceId is not secret (it ships in the client bundle); returned so a deploy can be verified per tier.
    res.json({ sessionId: session.id, url: session.url, priceId });
  } catch (error: any) {
    console.error('Stripe Error:', error);
    res.status(500).json({ error: error.message });
  }
}
