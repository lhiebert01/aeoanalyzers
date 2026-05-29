import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { planId, userId, email } = req.body;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

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

    const appUrl = process.env.VITE_APP_URL || 'https://aeoanalyzers.com';

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
