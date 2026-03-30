# AEO Analyzers: Executive Business Summary
## Strategic Value Proposition & ROI Analysis

### Mission & Objectives
**Mission**: To empower businesses, brands, and developers to become the "Source of Truth" in the Answer Engine era.
**Objective**: To provide the first automated platform for measuring, auditing, and optimizing website and app content for AI-driven search (AEO).

### Current Version: v1.3 (March 2026)
**Live at**: https://www.aeoanalyzers.com

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
| **Auth & Database** | Supabase (PostgreSQL + Auth + RLS) | User accounts, profiles, analysis history |
| **AI Analysis** | Google Gemini API (gemini-3-flash-preview) | Website AEO scoring, advanced analysis & recommendations |
| **Reports** | docx (in-browser generation) | Professional DOCX report download with code-splitting |
| **Payments** | Stripe | Subscription billing (Free, Pro $49/mo, Business $199/mo) |
| **Analytics** | Google Analytics 4 (GA4) | User tracking & conversion metrics |
| **Hosting** | Vercel | Static site + serverless API routes |
| **DNS** | Network Solutions | Domain management for aeoanalyzers.com |

**Production URL**: https://www.aeoanalyzers.com
**Repository**: https://github.com/lhiebert01/aeoanalyzers

---

### Strategic Business Case: The "Why"

#### 1. Defining the "Attribution Gap"
The **Attribution Gap** is the most critical threat to digital visibility in the AI era. It occurs when an Answer Engine (like Gemini, ChatGPT, or Perplexity) uses your website's content to synthesize a response but fails to provide a clickable link or clear citation back to your site.
- **The Result**: The user gets the value of your expertise, but you get **zero traffic**, **zero data**, and **zero brand recognition**.
- **The Solution**: AEO Analyzers identifies the technical and semantic reasons *why* an AI agent is failing to cite you, providing a roadmap to close the gap.

#### 2. What is a "Brand" or "Business" in the AEO Era?
Many organizations (Small Businesses, Shopify Stores, Governments, Non-Profits) don't think of themselves as "Brands." In the context of AEO, a **Brand/Business** is any entity that publishes authoritative information online.
- **E-commerce Businesses (Shopify/WooCommerce)**: Your "Brand" is your product expertise. You want to be the one the AI recommends when a user asks "What is the best eco-friendly yoga mat?"
- **App Developers**: Your "Brand" is your technical utility. You need AI agents to understand your app's functionality so they can recommend it as a solution to user problems.
- **Small Businesses**: If you are a local plumber, your "Brand" is your local expertise. You want to be the one the AI recommends when a user asks "How do I fix a leaky pipe in Seattle?"
- **Governments & NGOs**: Your "Brand" is your public trust. You need AI agents to cite your official guidelines accurately to prevent misinformation.
- **Enterprises**: Your "Brand" is your market authority. You are defending your position against AI-generated summaries that might favor competitors.

---

### Product Capabilities (v1.3)

#### Core Analysis
- **AEO Score Engine:** AI-powered scoring (0-100) with transparent formula: Entity×0.3 + Density×0.3 + Clarity×0.2 + Structure×0.2
- **Citation Probability:** Percentage likelihood of AI attribution
- **Competitive Duel:** Head-to-head comparison against competitor websites

#### Advanced Diagnostics (v1.2)
Six deep-dive features that would cost $30K-$50K from a consulting firm:
1. **Citation Hook Density** — Counts citable facts, surfaces top 3 most quotable sentences
2. **E-E-A-T Author Audit** — Author detection, trust signal scoring, generic author flags
3. **LLM Summarization Test** — Does AI understand what your page is actually about?
4. **Zero-Click Predictor** — Featured snippet opportunities and readiness scoring
5. **Query-to-Content Gap** — Top 10 niche questions rated Strong/Partial/Missing
6. **Semantic Chunking** — Finds unstructured content blocks, suggests headings

#### Enhanced Actionable Reports (v1.3)
The latest release transforms reports from diagnostic to prescriptive:
- **Comprehensive JSON-LD Schema** — Full OfferCatalog listing ALL detected products/services, ready to paste
- **Content Rewrite Examples** — 3-5 "Adjective-to-Metric" before/after rewrites from the actual page
- **Meta Description Rewrite** — Current vs. suggested, marketing fluff replaced with technical specifics
- **Implementation Checklist** — 5-8 categorized actions (Technical/Authority/Structural/Editorial/Coverage) with priority tags
- **5 DOCX Appendix Sections** — Comprehensive Schema, Content Rewrites table, Meta Description, Knowledge Gap Action Table, Implementation Checklist
- **Enhanced Handoff Email** — Complete implementation specification in a single copy-paste template

#### Reports & Platform
- **Professional DOCX Report** — 14+ section Word document with appendix sections, generated in-browser (Pro feature)
- **Implementation Roadmap** — Platform-specific guides for WordPress, Shopify, HubSpot, Wix, Custom Code
- **Analysis History** — Track AEO score improvements over time with full detail view
- **Google OAuth + Email Auth** — Secure authentication via Supabase
- **Admin Dashboard** — User management, growth metrics, GA4 analytics link
- **Stripe Subscriptions** — Free (1 analysis), Pro ($49/mo), Business ($199/mo)

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

### Current Status & Next Steps
- **Live in Production** — https://www.aeoanalyzers.com with Stripe payments active
- **v1.3 Shipped** — Enhanced actionable reports with comprehensive JSON-LD, content rewrites, and implementation checklists
- **Growth Focus** — Continue authority building via LinkedIn audits, agency partnerships, and organic content
- **Roadmap** — Multi-page analysis, white-label agency mode, historical trend tracking

---
*AEO Analyzers is not just a tool; it's the infrastructure for the next decade of digital marketing.*
