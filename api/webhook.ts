import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { appGate, ignoredLine, type GateDecision } from './_lib/stripeAppGate.js';

/** The events this handler acts on. Every one passes the app gate first. */
export const HANDLED = new Set(['checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted']);

export interface WebhookDeps {
  gate: (event: Stripe.Event) => Promise<GateDecision>;
  updateUserById: (id: string, values: Record<string, unknown>) => Promise<void>;
  updateUserByCustomer: (customer: string, values: Record<string, unknown>) => Promise<void>;
  log: (line: string) => void;
}

/** WO-PORTFOLIO-STRIPE-WEBHOOK-ISOLATION-001: nothing below the gate runs for another app's event —
 *  no database write, no email (this handler sends none), no entitlement. Returns what it did. */
export async function processEvent(event: Stripe.Event, deps: WebhookDeps): Promise<'ignored' | 'unhandled' | 'applied'> {
  if (!HANDLED.has(event.type)) return 'unhandled';
  const d = await deps.gate(event);
  if (!d.mine) { deps.log(ignoredLine(event, d)); return 'ignored'; }
  const now = new Date().toISOString();

  if (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.updated') {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    if (userId && planId === 'report') {
      // One-time Day Pass: grant 24h of full access. Does NOT touch
      // subscription_status (so a free user stays "free" after the pass expires).
      if (session.payment_status === 'paid' || session.status === 'complete') {
        const passUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await deps.updateUserById(userId, { report_pass_until: passUntil, stripe_customer_id: session.customer, updated_at: now });
        deps.log(`Granted 24h Day Pass to user ${userId} until ${passUntil}`);
      }
    } else if (userId) {
      const status = session.status === 'complete' || session.status === 'active' ? (planId === 'business' ? 'Business' : 'Pro') : 'Free';
      await deps.updateUserById(userId, { subscription_status: status, stripe_customer_id: session.customer, updated_at: now });
      deps.log(`Updated subscription for user ${userId} to ${status}`);
    }
  }
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any;
    // Find user by stripe customer ID and downgrade
    if (subscription.customer) await deps.updateUserByCustomer(subscription.customer, { subscription_status: 'free', updated_at: now });
  }
  return 'applied';
}

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
    await processEvent(event, {
      gate: (e) => appGate(e, stripe),
      updateUserById: async (id, values) => { await supabaseAdmin.from('users').update(values).eq('id', id); },
      updateUserByCustomer: async (customer, values) => { await supabaseAdmin.from('users').update(values).eq('stripe_customer_id', customer); },
      log: (m) => console.log(m),
    });
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook Processing Error:', error);
    res.status(500).send('Internal Server Error');
  }
}
