# AEO Analyzer: Executive Business Summary
## Strategic Value Proposition & ROI Analysis

### Mission & Objectives
**Mission**: To empower businesses, brands, and developers to become the "Source of Truth" in the Answer Engine era.
**Objective**: To provide the first automated platform for measuring, auditing, and optimizing website and app content for AI-driven search (AEO).

---

### Unit Economics: Cost to Support One Subscriber

| Tier | Monthly Cost (Est.) | Usage Assumption | Primary Cost Drivers |
| :--- | :--- | :--- | :--- |
| **Free Tier** | **$0.02** | 3 Analyses | Gemini API (free tier), Supabase storage |
| **Paid Tier** | **$0.25** | 50 Analyses | Increased AI tokens, Historical tracking |

**Key Takeaway**: The marginal cost of supporting a user is extremely low, allowing for high gross margins (>95%) even at the $49/mo price point.

---

### ROI & TCO (Total Cost of Ownership)

#### Total Cost of Ownership (TCO) - Current Production

| Item | Monthly Cost | Notes |
| :--- | :--- | :--- |
| **Supabase (Paid Tier)** | ~$10 | PostgreSQL, Auth, RLS, storage |
| **Vercel Hosting** | $0 - $20 | Free tier sufficient for current scale |
| **Gemini API** | $0 | Free tier (generous limits) |
| **Stripe** | Transaction fees only | 2.9% + $0.30 per charge |
| **Network Solutions (DNS)** | ~$2 | Domain registration amortized |
| **Total** | **~$10 - $30/mo** | |

**Previous Stack Cost (Cloud Run)**: ~$200/day (~$6,000/month) for Firebase + Google Cloud Run with Nginx sidecar.
**New Stack Cost**: ~$10/month (Supabase paid tier) -- a **99.8% reduction** in infrastructure costs.

#### Expected ROI (Year 1)
- **Revenue Target**: $10,000 - $50,000 (Conservative, targeting 20-100 Pro users).
- **ROI Benefit**: High. Infrastructure costs are negligible relative to revenue. The "Blue Ocean" nature of AEO means low customer acquisition costs (CAC) through organic authority building.

---

### Tech Stack Overview

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript | UI framework |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Animations** | Motion (Framer Motion) | Page transitions & micro-interactions |
| **Icons** | Lucide React | Icon library |
| **Build** | Vite 6 | Dev server & bundler |
| **Auth & Database** | Supabase (PostgreSQL + Auth with RLS) | User accounts, profiles, analysis history |
| **AI Analysis** | Google Gemini API (free tier) | Website AEO scoring & recommendations |
| **Payments** | Stripe | Subscription billing |
| **Hosting** | Vercel | Static site + serverless API routes |
| **DNS** | Network Solutions | Domain management for aeoanalyzers.com |

**Production URL**: https://www.aeoanalyzers.com
**Repository**: https://github.com/lhiebert01/aeoanalyzers

---

### Strategic Business Case: The "Why"

#### 1. Defining the "Attribution Gap"
The **Attribution Gap** is the most critical threat to digital visibility in the AI era. It occurs when an Answer Engine (like Gemini, ChatGPT, or Perplexity) uses your website's content to synthesize a response but fails to provide a clickable link or clear citation back to your site.
- **The Result**: The user gets the value of your expertise, but you get **zero traffic**, **zero data**, and **zero brand recognition**.
- **The Solution**: AEO Analyzer identifies the technical and semantic reasons *why* an AI agent is failing to cite you, providing a roadmap to close the gap.

#### 2. What is a "Brand" or "Business" in the AEO Era?
Many organizations (Small Businesses, Shopify Stores, Governments, Non-Profits) don't think of themselves as "Brands." In the context of AEO, a **Brand/Business** is any entity that publishes authoritative information online.
- **E-commerce Businesses (Shopify/WooCommerce)**: Your "Brand" is your product expertise. You want to be the one the AI recommends when a user asks "What is the best eco-friendly yoga mat?"
- **App Developers**: Your "Brand" is your technical utility. You need AI agents to understand your app's functionality so they can recommend it as a solution to user problems.
- **Small Businesses**: If you are a local plumber, your "Brand" is your local expertise. You want to be the one the AI recommends when a user asks "How do I fix a leaky pipe in Seattle?"
- **Governments & NGOs**: Your "Brand" is your public trust. You need AI agents to cite your official guidelines accurately to prevent misinformation.
- **Enterprises**: Your "Brand" is your market authority. You are defending your position against AI-generated summaries that might favor competitors.

---

### Target Market & Audience

#### Who is this App for?
- **Marketing Agencies**: Who need to prove to their clients that they are staying ahead of the AI shift.
- **App Developers**: Who build beautiful websites but miss the "invisible" meta-information (Schema, JSON-LD, Semantic HTML) that makes them discoverable by AI.
- **Shopify & E-commerce Owners**: Who need their product descriptions to be "AI-Readable" to win the recommendation in AI shopping assistants.
- **In-house SEO/Content Teams**: Who need data-driven metrics to justify technical changes to their site structure.
- **Small Business Owners**: Who want to ensure their local expertise is recognized by AI agents.
- **Public Information Officers (Gov/NGO)**: Who must ensure official sources are the primary citation for public queries.

#### Who is it NOT for?
- **Content Scrapers**: Sites that don't produce original, authoritative content.
- **Purely Transactional Sites**: Sites with no informational value (e.g., a site that only has a "Buy Now" button with no product descriptions).
- **Entities Ignoring Organic Traffic**: Those who rely solely on paid ads and don't care about their long-term organic authority.

---

### Onboarding: Solving the "Zero to One" Problem
To get the first 100 users without a massive ad budget:

1. **The "Free Audit" Hook**: Offer free, high-quality AEO audits on LinkedIn for top brands.
2. **Authority Building**: Publish a weekly "State of AEO" report using the app's data to show which industries are winning/losing in AI citations.
3. **Agency Partnerships**: Partner with SEO agencies to offer AEO as a "Premium Add-on" service.
4. **Direct Outreach**: Target companies currently running heavy Google Ads -- they are the most sensitive to losing organic visibility to AI.

---

### Risks & Dependencies
- **LLM Changes**: If Gemini or GPT significantly change how they cite sources, our scoring model must adapt.
- **Crawl Blocking**: Large sites may block our crawler (mitigated by our serverless proxy on Vercel).
- **Dependency**: Highly dependent on the Google Gemini API (mitigated by the multi-model potential of the architecture).

---

### Vital Next Steps
1. **Launch Beta**: Invite 10 SEO influencers to test the tool.
2. **Content Engine**: Create 5 blog posts explaining "What is AEO?" to capture early search intent.
3. **Stripe Live**: Production Stripe keys are active -- continue monitoring transactions.

---
*AEO Analyzer is not just a tool; it's the infrastructure for the next decade of digital marketing.*
