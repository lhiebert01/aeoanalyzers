# AEO Analyzer: Launch Plan
## From MVP to Production and Revenue

### 1. Launch Checklist (CONCISE)

#### Step 1: Domain and DNS
- **Purchase Domain**: `aeoanalyzer.com` or `aeo-analyzer.io` (GoDaddy or Google Domains).
- **DNS Setup (GoDaddy)**:
  - Create an `A` record pointing to your hosting provider's IP (e.g., Cloud Run or Vercel).
  - Create a `CNAME` record for `www` pointing to `@`.
  - Add `TXT` records for Firebase domain verification.

#### Step 2: Production Hosting
- **Vercel/Render (Recommended for SPAs)**:
  - Connect your GitHub repo.
  - Set environment variables (`GEMINI_API_KEY`, `VITE_STRIPE_PUBLIC_KEY`, etc.).
  - Deploy.
- **Google Cloud Run (Recommended for Full-Stack)**:
  - Build and push your Docker image.
  - Map your custom domain to the Cloud Run service.

#### Step 3: Stripe Production Mode
- **Switch to Live Mode**: In the Stripe Dashboard, toggle "Live Mode".
- **Update Keys**: Replace `VITE_STRIPE_PUBLIC_KEY` and `STRIPE_SECRET_KEY` with live keys.
- **Webhook**: Set up a webhook endpoint (e.g., `/api/stripe-webhook`) to handle subscription updates.

#### Step 4: GA4 Integration
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
- **Pro Tier**: 50 analyses/mo + Schema Generator (Value).
- **Business Tier**: 500 analyses/mo + Competitor Benchmarking (Scale).

---
*Ready for Launch? Let's go!*
