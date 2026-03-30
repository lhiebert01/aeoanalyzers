# AEO Analyzers: System Admin Guide
## Deployment, Management, and Operations

This guide is for the **SuperAdmin** (`lindsay.hiebert@gmail.com`) to manage AEO Analyzers in production.

**Current Version**: v1.3 (March 2026)
**Live at**: https://www.aeoanalyzers.com

### 1. Production Deployment Strategy
The app is built as a **React SPA with Vercel serverless API routes**.

- **Frontend**: React 19 + TypeScript, Tailwind CSS v4, Motion (Framer Motion), Lucide React.
- **Build Tool**: Vite 6.
- **Auth & Database**: Supabase (PostgreSQL + Auth with Row Level Security).
- **AI**: Google Gemini API (gemini-3-flash-preview).
- **Reports**: docx library (in-browser DOCX generation, code-split via dynamic import).
- **Payments**: Stripe (Free, Pro $49/mo, Business $199/mo).
- **Analytics**: Google Analytics 4 (GA4).
- **Hosting**: Vercel (static site + serverless API routes).
- **DNS**: Network Solutions (aeoanalyzers.com).
- **Repo**: https://github.com/lhiebert01/aeoanalyzers

#### Deployment Steps (Vercel):
1. **Push to GitHub**: Vercel auto-deploys from the connected repository on every push.
2. **Build**: Vercel runs `npm run build` automatically (Vite production build).
3. **Env Vars**: Set `GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the Vercel dashboard.
4. **Preview Deployments**: Every pull request gets a unique preview URL for testing before merge.

### 2. Managing Users and Subscriptions
The **SuperAdmin Dashboard** is your command center.
- **User Metrics**: View total users, free vs. pro subscribers.
- **User Support**: Use the dashboard to manually manage user accounts or view user activity.
- **Supabase Dashboard**: For deep data management, use the [Supabase Dashboard](https://supabase.com/dashboard):
  - **Table Editor**: View and edit `users` and `analysis_history` tables directly.
  - **Auth**: Manage user accounts, reset passwords, view sign-in providers.
  - **SQL Editor**: Run ad-hoc queries against the PostgreSQL database.
  - **RLS Policies**: Review and update Row Level Security policies to control data access.

### 3. CI/CD and Ongoing Development
- **Local Dev**: `npm run dev` (starts Vite dev server on http://localhost:5173).
- **Testing**: Run `npm run lint` before every push.
- **Preview Deployments**: Vercel automatically creates preview deployments for every pull request -- use these as staging environments.
- **Production**: Merges to `main` branch auto-deploy to production.
- **Feature Flags**: Use Supabase table data or environment variables to toggle experimental features for specific users.

### 4. Monitoring and Analytics
- **GA4**: Access Google Analytics 4 (linked from Admin Dashboard "Open GA4" button) for real-time user streams and conversion funnels.
- **Vercel Analytics**: Use Vercel's built-in analytics for performance monitoring (Web Vitals, function execution times).
- **Supabase Logs**: Check Supabase Dashboard > Logs for database queries, auth events, and API usage.
- **Vercel Logs**: Check Vercel Dashboard > Deployments > Functions tab for serverless function logs and errors.

### 5. Key Application Features (for Support Reference)

#### Analysis Output (v1.2+)
Each analysis generates: AEO Score (0-100) with transparent formula breakdown (Entity/Density/Clarity/Structure), Citation Probability, and 6 advanced diagnostics (Citation Hook Density, E-E-A-T Author Audit, LLM Summarization Test, Zero-Click Predictor, Query-to-Content Gap, Semantic Chunking).

#### Enhanced Reports (v1.3)
Reports now include 4 additional AI-generated outputs:
- **Comprehensive JSON-LD Schema** — Full OfferCatalog covering all detected products/services
- **Content Rewrite Examples** — Before/after rewrites from the actual analyzed page
- **Meta Description Rewrite** — Current vs. suggested
- **Implementation Checklist** — Categorized actions with High/Medium/Low priority

#### DOCX Report (Pro feature)
One-click download generates a professional Word document with 14+ sections plus 5 appendix sections (Appendix A-E). Generated entirely in-browser — no data leaves the user's machine. The docx library is code-split and only loaded when the user clicks "Download Report."

#### Handoff Email Template (Pro feature)
Copy-paste template includes the full analysis, comprehensive schema, content rewrites, knowledge gap FAQ, and implementation checklist.

### 6. Troubleshooting
- **Permission Denied (Database)**: Check Supabase RLS policies. Ensure the user is authenticated and policies allow the operation.
- **Auth Issues**: Check Supabase Dashboard > Authentication for user status, confirm redirect URLs are configured correctly.
- **Stripe Issues**: Check the Stripe Dashboard for failed webhooks or incomplete payments. Verify webhook endpoint (`/api/webhook`) is receiving events.
- **AI Errors**: Ensure the `GEMINI_API_KEY` is valid and has not hit its quota.
- **Build Failures**: Check Vercel Dashboard > Deployments for build logs and error output.

### 7. Cost Overview
- **Supabase (Paid Tier)**: ~$10/month (PostgreSQL, Auth, storage, real-time).
- **Vercel (Free/Pro)**: $0-$20/month (hosting, serverless functions, bandwidth).
- **Gemini API (Free Tier)**: $0 (within free tier limits).
- **Stripe**: 2.9% + $0.30 per transaction (no monthly fee).
- **Total**: ~$10/month baseline (a significant reduction from the previous ~$200/day Cloud Run setup).

---
*SuperAdmin credentials are stored securely and should never be committed to version control.*
