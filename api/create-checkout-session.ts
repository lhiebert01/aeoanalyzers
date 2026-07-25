import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

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
  const { action, planId, userId, email } = req.body || {};

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
      ? process.env.VITE_STRIPE_PRICE_ID_REPORT
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: isDayPass ? 'payment' : 'subscription',
      success_url: `${appUrl}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payments`,
      customer_email: email,
      // subscription_data is only valid in subscription mode; use payment_intent_data for one-time.
      ...(isDayPass
        ? { payment_intent_data: { metadata: { userId, planId } } }
        : { subscription_data: { metadata: { userId, planId } } }),
      metadata: { userId, planId },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe Error:', error);
    res.status(500).json({ error: error.message });
  }
}
