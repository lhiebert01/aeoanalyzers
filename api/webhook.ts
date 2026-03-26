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
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;

      if (userId) {
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
