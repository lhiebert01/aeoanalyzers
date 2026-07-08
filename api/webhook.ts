import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Disable body parsing so we can verify the Stripe signature
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers['stripe-signature'];

  if (!stripeKey || !sig || !webhookSecret) {
    console.error('Webhook Error: Missing configuration');
    return res.status(400).send('Webhook Error: Missing configuration');
  }

  const stripe = new Stripe(stripeKey);

  // Use Supabase service role key for server-side writes
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.updated') {
      const session = event.data.object as any;

      // App gate: the shared PIGENAI Stripe account sends EVERY app's events
      // here, and other apps (AI Stock Assist) use the same metadata keys
      // (userId/planId) — a foreign "planId: pro" purchase must never set
      // subscription status in AEO's database. Only sessions created by this
      // app carry our domain in their URLs.
      const urls = `${session.success_url || ''} ${session.cancel_url || ''}`;
      if (session.object === 'checkout.session' && !urls.includes('aeoanalyzers.com')) {
        console.log(`Ignoring foreign-app event ${event.id} (${urls.trim().slice(0, 80)})`);
        return res.json({ received: true });
      }

      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;

      if (userId && planId === 'report') {
        // One-time Day Pass: grant 24h of full access. Does NOT touch
        // subscription_status (so a free user stays "free" after the pass expires).
        if (session.payment_status === 'paid' || session.status === 'complete') {
          const passUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await supabaseAdmin
            .from('users')
            .update({
              report_pass_until: passUntil,
              stripe_customer_id: session.customer,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
          console.log(`Granted 24h Day Pass to user ${userId} until ${passUntil}`);
        }
      } else if (userId) {
        const status =
          session.status === 'complete' || session.status === 'active'
            ? planId === 'business'
              ? 'Business'
              : 'Pro'
            : 'Free';

        await supabaseAdmin
          .from('users')
          .update({
            subscription_status: status,
            stripe_customer_id: session.customer,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        console.log(`Updated subscription for user ${userId} to ${status}`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;
      // Find user by stripe customer ID and downgrade
      if (subscription.customer) {
        await supabaseAdmin
          .from('users')
          .update({
            subscription_status: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', subscription.customer);
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook Processing Error:', error);
    res.status(500).send('Internal Server Error');
  }
}
