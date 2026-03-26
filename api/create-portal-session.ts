import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email } = req.body;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

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

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Portal Error:', error);
    res.status(500).json({ error: error.message });
  }
}
