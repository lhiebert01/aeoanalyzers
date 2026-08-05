# AEO Analyzers

**Multiple AI Engines. One Score. 90 Seconds.**

AEO Analyzers is a professional-grade AI Simulation Engine that helps brands, businesses, and developers optimize for **Answer Engine Optimization (AEO)**. We simulate how multiple AI engines — Gemini, ChatGPT, Perplexity — perceive your website, delivering insights that would take a web team hundreds of hours, in 90 seconds.

**Live at:** https://www.aeoanalyzers.com

## Key Features

### Core Analysis
- **Multi-Engine AI Simulation:** Simulates how multiple AI engines perceive your content — not a single algorithm, real-world results
- **AEO Score Engine:** AI-powered analysis of any website's readiness for answer engine citation (0-100 score)
- **Transparent Score Formula:** Score = Entity×0.3 + Density×0.3 + Clarity×0.2 + Structure×0.2 — fully visible breakdown with progress bars
- **Citation Probability:** Proprietary metric showing likelihood of AI attribution
- **Competitive Duel:** Head-to-head comparison against competitor websites

### Advanced Analysis (v1.2)
- **Citation Hook Density:** Counts stats, percentages, and citable facts. Surfaces the top 3 most quotable sentences from your content
- **E-E-A-T Author Audit:** Checks author attribution, Schema.org/Person, LinkedIn links. Flags generic authors ("Admin", "Staff"). Trust signal scoring (0-100)
- **LLM Summarization Test:** Compares what your metadata says the page is about vs. what AI actually understands. Flags Aligned / Vague / Misaligned
- **Zero-Click Predictor:** Identifies text blocks that should be tables or lists for Featured Snippets. Snippet readiness scoring (0-100)
- **Query-to-Content Gap:** Generates the top 10 questions users would ask in your niche, checks if your content answers them (Strong / Partial / Missing)
- **Semantic Chunking:** Finds content blocks >150 words without headings. Suggests header improvements. Chunking score (0-100)

### Enhanced Actionable Reports (v1.3)
- **Comprehensive JSON-LD Schema:** Full OfferCatalog listing ALL detected products, services, and capabilities — not just a single-service snippet. Ready to paste into `<head>`
- **Content Rewrite Examples:** 3-5 "Adjective-to-Metric" before/after rewrites from the actual analyzed content, showing AI-citable alternatives
- **Meta Description Rewrite:** Current vs. suggested meta description with marketing fluff replaced by technical specifics
- **Implementation Checklist:** 5-8 prioritized actions categorized as Technical, Authority, Structural, Editorial, or Coverage with High/Medium/Low priority tags
- **5 DOCX Appendix Sections:** Comprehensive Schema, Content Rewrites table, Meta Description Rewrite, Knowledge Gap Action Table, and Implementation Checklist — all in the downloadable report

### Trust & Accuracy (v1.4)
- **Brand-Type Detection:** Classifies the site (editorial / news / SaaS / ecommerce / service) and applies the right playbook before generating any recommendation
- **Voice Protection for Editorial Brands:** Never proposes corporate "adjective-to-metric" rewrites for editorial/news sites — their voice is treated as a moat; they get schema-density recommendations instead
- **Provenance-Tagged Schema:** Splits JSON-LD into a **Verified — safe to paste** block (detected values only, with source quotes) and a **Candidate — verify before pasting** block (inferred values, flagged) so you never paste an invented fact into your `<head>`
- **Honest OfferCatalog:** Lists only user-facing services; filters out internal architecture terms (Layer/Engine/Framework/…) and caps at the strongest 4
- **"Schema Only" Gap Category:** Distinguishes content that's genuinely missing from content that exists in prose but lacks FAQ schema — recommends *wrapping* existing content instead of writing duplicates (shows the on-page source quote)
- **Capability-Scoped Questions:** Drops questions about features the site doesn't offer; keeps capability-matched + universally-useful ones
- **Calibrated, Isolated Scoring:** The numeric score reflects objective AEO merit and stays comparable run-over-run; editorial prose is no longer penalized for low statistic counts
- **Regression-Tested:** A `vitest` suite (`npm test`) pins the accuracy rules; resilient `safeJsonParse` + raised token ceiling harden model-response handling

### Citation Sweeps & Measurement Loop (v1.7–v1.8) — the flagship capability
Beyond the 90-second diagnostic, AEO Analyzers runs **tested Citation Sweeps**: it asks ChatGPT, Claude, Perplexity, and Gemini your buyers' real questions **several times per query, with web search on**, and reports **three separable layers** — each with its own fix path, **every score backed by a stored transcript**:
- **Retrievability** — can the engines reach you (branded)?
- **Fidelity** — do they get you *right*? Cited-accurate vs. cited-drifted, plus **entity-collision detection** that names exactly which similarly-named things the engines confuse you with.
- **Citation Win** — do they recommend you over competitors on the unbranded buyer question?

Measurement integrity is built in: truncated answers are **excluded** (never shown as a fake 0%), search-grounded vs. model-prior answers are scored **separately**, and every metric carries its **sample size + confidence**. Recommendations are **tiered by attainability** (do-this-week / earn / aspirational) — no "get on Wikipedia" goose chases. Research-anchored (PAWC per the Princeton GEO study; fact-density auditor; llms.txt generator + validator). A **courtesy-sweep generator** (`scripts/exec-report.ts`) turns any domain into a review-ready executive report + draft outreach email (**draft-only; nothing auto-sends**). No exploit-class tactics — we win on measurement honesty.

### Reports & Handoff
- **DOCX Report Download:** Professional Word document with full analysis, score breakdown, advanced insights, implementation instructions, appendix sections, and rollout plan — signed by the user (Pro feature)
- **Implementation Roadmap:** Actionable optimization steps with platform-specific guides for WordPress, Shopify, HubSpot, Wix, and custom code (Pro feature)
- **Web Team Handoff:** Copy-paste email template with comprehensive JSON-LD, content rewrites, knowledge gap FAQ, implementation checklist, findings, and technical instructions

### Platform
- **Analysis History:** Track your AEO score improvements over time with full detail view
- **Google OAuth + Email Auth:** Secure authentication via Supabase with Google sign-in support
- **Admin Dashboard:** User management, growth metrics, and GA4 analytics link
- **GA4 Analytics:** Full Google Analytics 4 integration for tracking user behavior and conversions
- **Stripe Subscriptions:** Free (1 analysis), Pro ($49/mo), and Business ($199/mo) tiers
- **Free Tier Gate:** 1 free analysis, then upgrade required — usage tracked server-side

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + TypeScript | UI framework |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Animations** | Motion (Framer Motion) | Page transitions & micro-interactions |
| **Icons** | Lucide React | Icon library |
| **Build** | Vite 6 | Dev server & bundler |
| **Auth & Database** | Supabase (PostgreSQL + Auth + RLS) | User accounts, profiles, analysis history |
| **AI Analysis** | Google Gemini API (gemini-3.6-flash → 3.5-flash → 3.5-flash-lite → 2.5-flash fallback chain) | Website AEO scoring, advanced analysis & recommendations |
| **Sweep Engines** | Claude / OpenAI / Perplexity / Gemini (server, key-gated `api/_lib/engines.ts`) | Multi-engine Citation Sweeps with web search |
| **Reports** | docx (in-browser generation) | Professional DOCX report download with code-splitting |
| **Payments** | Stripe | Subscription billing |
| **Analytics** | Google Analytics 4 (GA4) | User tracking & conversion metrics |
| **Hosting** | Vercel | Static site + serverless API routes |
| **DNS** | Network Solutions | Domain management for aeoanalyzers.com |

## Architecture

```
Browser (React SPA)
  ├── Supabase Auth (email signup, login, Google OAuth)
  ├── Supabase PostgreSQL (users, analysis_history with RLS)
  ├── Gemini API (multi-engine AI simulation, client-side)
  ├── Google Analytics 4 (GA4 event tracking)
  └── Vercel API Routes (serverless)
        ├── /api/fetch-site (HTML proxy with full Chrome browser headers)
        ├── /api/create-checkout-session (Stripe)
        ├── /api/create-portal-session (Stripe billing portal)
        └── /api/webhook (Stripe webhooks → Supabase service role)
```

## Getting Started

### Prerequisites
- Node.js v18+
- npm
- A Supabase project (free or paid)
- A Gemini API key (free tier)
- A Google Cloud Console project (for Google OAuth)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/lhiebert01/aeoanalyzers.git
   cd aeoanalyzers
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase URL, anon key, and Gemini API key.

4. Run the database schema:
   - Open your Supabase SQL Editor
   - Paste and run the contents of `supabase-schema.sql`

5. Configure Google OAuth:
   - Create OAuth credentials in Google Cloud Console
   - Add redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - Add Client ID and Secret to Supabase Auth > Providers > Google

6. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | For payments |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | For payments |
| `VITE_STRIPE_PRICE_ID_PRO` | Stripe Pro plan price ID | For payments |
| `VITE_STRIPE_PRICE_ID_BUSINESS` | Stripe Business plan price ID | For payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | For payments |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | For webhooks |
| `VITE_APP_URL` | Production URL | Yes |

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | TypeScript type checking |

## Database Schema

Two tables with Row Level Security (RLS):

- **`users`** — User profiles (linked to Supabase Auth), subscription status, usage tracking
- **`analysis_history`** — AEO analysis results, scores, citation probabilities, full AI results stored as JSON

See `supabase-schema.sql` for the full schema including indexes, RLS policies, and triggers.

## Deployment

The app is deployed on **Vercel** with automatic builds on push:

1. Push to GitHub
2. Vercel auto-deploys from the connected repo
3. Environment variables are configured in the Vercel dashboard
4. Custom domain `aeoanalyzers.com` with auto-provisioned SSL

## Documentation

- [Brand & Messaging Guide](./docs/brand-messaging-guide.md) -- single source of truth: positioning, USPs, benefits, CTA system, canonical assets
- [Master Announcement](./docs/master-announcement.md) -- every post ready to paste, with image references
- [STATUS.md](./STATUS.md) -- **Production source-of-truth**: version, live env vars, features, integrations, pending items
- [Release Notes](./RELEASE-NOTES.md) -- Full changelog for all versions
- [GTM-90 Status & Plan (2026-08-05)](./docs/GTM90-STATUS-AND-PLAN-2026-08-05.md) -- **Authoritative launch/content/outreach plan — start here**
- [Freeze Report (2026-07-31)](./docs/FREEZE-REPORT-2026-07-31.md) -- v1.8.0 feature-freeze line + post-freeze backlog
- [Honest-Zero Launch Kit](./docs/launch/MASTER-honest-zero-part1-launch-kit.md) -- POSSE blog series + per-channel copy
- [AEO/GEO Community Targets](./docs/launch/aeo-geo-community-targets.md) + [Reddit Comment Queue](./docs/launch/reddit-comment-queue.md) -- buyer-community distribution motion
- [Re-Launch Announcement (2026)](./docs/blog-relaunch-2026.md) -- Flagship re-intro: differentiation, outcomes, strong CTA
- [Go-To-Market Plan](./docs/go-to-market-plan.md) -- Announce / market / sell roadmap + blog cadence
- [Prerender Plan](./docs/prerender-plan.md) -- How the SPA is made crawlable to AI engines
- [v1.4 Launch: Trustworthy AEO](./docs/blog-v1.4-trustworthy-aeo-launch.md) -- Brand-aware analysis, provenance-safe schema, accurate scoring (launch announcement)
- [v1.4 Launch Plan & Messaging](./docs/launch-plan-v1.4.md) -- Positioning, audience hooks, ready-to-use copy, channel sequence
- [v1.4 Image Prompts](./docs/image-prompts-v1.4.md) -- Hero & in-article image generation prompts + asset-folder guide
- [v1.3 Release: Enhanced Reports](./docs/blog-v1.3-enhanced-reports.md) -- Enhanced Actionable Reports & Comprehensive JSON-LD announcement
- [v1.2 Re-Launch Announcement](./docs/blog-v1.2-relaunch-announcement.md) -- Feature announcement, executive summary, and social media posts
- [Admin Guide](./docs/admin-guide.md) -- Deployment, management, and operations
- [User Guide](./docs/user-guide.md) -- End-user guide for AEO analysis features
- [Executive Summary](./docs/executive-summary.md) -- Business case, ROI, and cost analysis
- [Launch Plan](./docs/launch-plan.md) -- Launch checklist and marketing plan
- [Hosting Setup](./docs/SETUP-HOSTING-INSTRUCTIONS.md) -- Vercel deployment and domain configuration
- [Domain & SSL Guide](./docs/CLOUD-RUN-SSL-DOMAIN-FIX-GUIDE.md) -- Vercel domain/SSL troubleshooting
- [Personas & FAQ](./docs/personas-and-faq.md) -- Target audience and frequently asked questions
- [Original Launch Blog](./docs/blog-90-seconds-vs-100-hours.md) -- "90 Seconds vs 100 Hours" blog post and social media templates

## Author

**Lindsay Hiebert** — lindsay.hiebert@gmail.com

## License

This project is licensed under the MIT License.
