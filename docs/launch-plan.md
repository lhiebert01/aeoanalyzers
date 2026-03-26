# AEO Analyzer: Launch Plan
## From MVP to Production and Revenue

### 1. Launch Checklist (CONCISE)

#### Step 1: Domain and DNS
- **Domain**: `aeoanalyzers.com` (registered via Network Solutions).
- **DNS Setup (Network Solutions)**:
  - Create an `A` record pointing `@` to `76.76.21.21` (Vercel).
  - Create a `CNAME` record for `www` pointing to `cname.vercel-dns.com`.
  - SSL is automatically provisioned by Vercel via Let's Encrypt.

#### Step 2: Production Hosting (Vercel)
- **Connect GitHub Repo**: Import `https://github.com/lhiebert01/aeoanalyzers` in Vercel.
- **Environment Variables**: Set in Vercel Dashboard:
  - `VITE_SUPABASE_URL` -- Supabase project URL.
  - `VITE_SUPABASE_ANON_KEY` -- Supabase anon/public key.
  - `GEMINI_API_KEY` -- Google Gemini API key.
  - `STRIPE_SECRET_KEY` -- Stripe secret key.
  - `VITE_STRIPE_PUBLISHABLE_KEY` -- Stripe publishable key.
  - `VITE_STRIPE_PRICE_ID_PRO` -- Stripe Pro plan price ID.
  - `VITE_STRIPE_PRICE_ID_BUSINESS` -- Stripe Business plan price ID.
  - `STRIPE_WEBHOOK_SECRET` -- Stripe webhook signing secret.
  - `SUPABASE_SERVICE_ROLE_KEY` -- Supabase service role key.
  - `VITE_APP_URL` -- `https://www.aeoanalyzers.com`.
- **Deploy**: Vercel auto-deploys on every push to `main`.
- **Preview Deployments**: Every pull request gets a unique preview URL.

#### Step 3: Supabase Setup
- **Database Schema**: Run `supabase-schema.sql` in the Supabase SQL Editor to create the `users` and `analysis_history` tables with RLS policies.
- **Auth Configuration**:
  - Set Site URL to `https://www.aeoanalyzers.com`.
  - Add redirect URLs for production, Vercel preview, and localhost.
  - Enable Google OAuth provider (configure in Supabase Dashboard > Authentication > Providers).

#### Step 4: Stripe Production Mode
- **Switch to Live Mode**: In the Stripe Dashboard, toggle "Live Mode".
- **Update Keys**: Replace `VITE_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` with live keys in Vercel.
- **Webhook**: Configure the webhook endpoint at `https://www.aeoanalyzers.com/api/webhook` in the Stripe Dashboard.
  - Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

#### Step 5: GA4 Integration
- **Create Property**: In Google Analytics, create a new GA4 property.
- **Add Stream**: Create a Web stream and get your `MEASUREMENT_ID`.
- **Add to App**: Insert the GA4 tracking code into `index.html`.

### 2. Marketing and Announcement Plan

#### Phase 1: The "Soft" Launch (Day 1-3)
- **Blog Post**: "Why SEO is Dead and AEO is the Future."
- **Socials**: Share a "Competitive Duel" screenshot on LinkedIn/Twitter.
- **Email**: Send to your waitlist (if any).

#### Phase 2: The "Hard" Launch (Day 4-7)
- **Press Release**: "AEO Analyzer Launches to Help Marketers Win the AI Citation Race."
- **Product Hunt**: Submit the app on Product Hunt.
- **Influencers**: Reach out to 5-10 SEO/Marketing influencers for a demo.

#### Phase 3: Scaling (Ongoing)
- **Content Marketing**: Weekly AEO tips on the blog.
- **Paid Ads**: Targeted LinkedIn ads for "Marketing Directors" and "SEO Agencies."

### 3. Revenue and Onboarding
- **Free Tier**: 5 analyses/mo (Hook).
- **Pro Tier ($49/mo)**: 50 analyses/mo + Schema Generator + Implementation Roadmap (Value).
- **Business Tier ($199/mo)**: 500 analyses/mo + Competitor Benchmarking + Priority Support (Scale).

### 4. Infrastructure Cost Summary

| Item | Monthly Cost |
| :--- | :--- |
| Supabase (Paid Tier) | ~$10 |
| Vercel (Free Tier) | $0 |
| Gemini API (Free Tier) | $0 |
| Stripe | Transaction fees only |
| Network Solutions (DNS) | ~$2 (amortized) |
| **Total** | **~$10/month** |

Previous infrastructure cost (Cloud Run): ~$200/day (~$6,000/month).

---
*Ready for Launch? Let's go!*
