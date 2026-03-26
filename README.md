# AEO Analyzers

**AEO Analyzers** is a professional-grade AI Simulation Engine that helps brands, businesses, and developers optimize for **Answer Engine Optimization (AEO)**. As search evolves from links to direct AI-generated answers (via Gemini, ChatGPT, Perplexity), this platform shows exactly how AI perceives your website and provides actionable insights to secure your citation.

**Live at:** https://aeoanalyzers.com

## Key Features

- **AEO Score Engine:** AI-powered analysis of any website's readiness for answer engine citation
- **Citation Probability:** Proprietary metric showing likelihood of AI attribution
- **Competitive Duel:** Head-to-head comparison against competitor websites
- **Implementation Roadmap:** Actionable optimization steps (Pro feature)
- **Analysis History:** Track your AEO score improvements over time
- **Admin Dashboard:** User management and growth metrics
- **Stripe Subscriptions:** Free, Pro ($49/mo), and Business ($199/mo) tiers

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + TypeScript | UI framework |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Animations** | Motion (Framer Motion) | Page transitions & micro-interactions |
| **Icons** | Lucide React | Icon library |
| **Build** | Vite 6 | Dev server & bundler |
| **Auth & Database** | Supabase (PostgreSQL + Auth) | User accounts, profiles, analysis history |
| **AI Analysis** | Google Gemini API (free tier) | Website AEO scoring & recommendations |
| **Payments** | Stripe | Subscription billing |
| **Hosting** | Vercel | Static site + serverless API routes |
| **DNS** | Network Solutions | Domain management for aeoanalyzers.com |

## Architecture

```
Browser (React SPA)
  ├── Supabase Auth (signup, login, Google OAuth)
  ├── Supabase PostgreSQL (users, analysis_history with RLS)
  ├── Gemini API (AI analysis, client-side)
  └── Vercel API Routes (serverless)
        ├── /api/fetch-site (HTML proxy with spoofed User-Agent)
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

5. Start the development server:
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
- **`analysis_history`** — AEO analysis results, scores, citation probabilities

See `supabase-schema.sql` for the full schema including indexes, RLS policies, and triggers.

## Deployment

The app is deployed on **Vercel** with automatic builds on push:

1. Push to GitHub
2. Vercel auto-deploys from the connected repo
3. Environment variables are configured in the Vercel dashboard
4. Custom domain `aeoanalyzers.com` with auto-provisioned SSL

## Documentation

- [Admin Guide](./docs/admin-guide.md) -- Deployment, management, and operations
- [User Guide](./docs/user-guide.md) -- End-user guide for AEO analysis features
- [Executive Summary](./docs/executive-summary.md) -- Business case, ROI, and cost analysis
- [Launch Plan](./docs/launch-plan.md) -- Launch checklist and marketing plan
- [Hosting Setup](./docs/SETUP-HOSTING-INSTRUCTIONS.md) -- Vercel deployment and domain configuration
- [Domain & SSL Guide](./docs/CLOUD-RUN-SSL-DOMAIN-FIX-GUIDE.md) -- Vercel domain/SSL troubleshooting
- [Personas & FAQ](./docs/personas-and-faq.md) -- Target audience and frequently asked questions

## Author

**Lindsay Hiebert** — lindsay.hiebert@gmail.com

## License

This project is licensed under the MIT License.
