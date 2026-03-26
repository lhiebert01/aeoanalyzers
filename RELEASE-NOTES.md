# Release Notes

## v1.1.0 — March 26, 2026

### Authentication & Security
- **Google OAuth:** Full Google sign-in support via Google Cloud Console + Supabase. Works for all users (app published to production).
- **Sign Out Fix:** Non-blocking sign out that clears all storage and forces page reload. No more hanging on sign out.
- **Auth Hang Fix:** Added 3-second safety timeout and immediate session check via `getSession()`. Page no longer hangs on refresh when Supabase auth is slow.
- **Free Tier Gate:** 1 free analysis per user, then upgrade required. Usage tracked server-side in Supabase (cannot be bypassed by clearing cookies).

### Analytics
- **GA4 Integration:** Google Analytics 4 fully configured with Measurement ID `G-WRY4D9ZS8E`. Tracks page views, scroll, login, form starts, and session events.
- **Admin GA4 Link:** "Open GA4" button in SuperAdmin Dashboard links directly to the GA4 property dashboard.

### Branding & Messaging
- **Consistent Branding:** All instances of "AEO Analyzer" (singular) updated to "AEO Analyzers" (plural) across the entire codebase — header, footer, SEO metadata, privacy policy, terms, FAQs, press kit, and handoff template.
- **Header Update:** Now reads "AEO ANALYZERS" matching the domain `aeoanalyzers.com`.
- **New Positioning:** "Multiple AI Engines. One Score. 90 Seconds." — emphasizes multi-engine simulation vs single-algorithm legacy tools, and the speed advantage over manual web team audits.
- **Updated SEO:** All meta descriptions, OpenGraph tags, JSON-LD structured data, and page titles updated with new messaging.

### Analysis & Reporting
- **Spinner Fix:** Analysis spinner now clears immediately when results are ready. Database saves (history + usage count) run in the background instead of blocking the UI.
- **History Reliability:** History tab no longer hangs on repeated navigation. Error handling ensures loading state always clears.
- **History Detail View:** "Viewing Saved Analysis" banner with URL displayed when viewing historical results. "View" column added to history table. Click any saved analysis to see full results including score breakdown, recommendations, and roadmap.
- **Null Safety:** Handles missing `full_result` in history records gracefully with user-friendly error message.

### Handoff Template Enhancements
- **JSON-LD Explanation:** Added blue info box explaining what JSON-LD is and how to add it on each platform.
- **Full Report Content:** Template now includes the analyzed URL, overall AEO score, AI-generated summary, key findings with individual scores, and the complete JSON-LD snippet.
- **Platform Guides:** Added HubSpot (Settings > Website > Pages > Site Header HTML) and Wix (Settings > Custom Code > Head) implementation guides alongside existing WordPress, Shopify, and Custom Code guides.

### Bug Fixes
- Fixed double-S typo ("AEO Analyzerss") in footer, privacy policy, and terms of service.
- Fixed fetch proxy 403 errors with full Chrome browser headers and www/non-www retry.

---

## v1.0.0 — March 26, 2026

### Initial Release (Supabase + Vercel Migration)
- Complete migration from Firebase/Cloud Run (~$200/day) to Supabase/Vercel (~$10/month) — 99.8% cost reduction.
- React 19 + TypeScript SPA with Tailwind CSS v4 and Motion (Framer Motion).
- Supabase Auth (email + password) with Row Level Security.
- Google Gemini API integration for AI-powered website analysis.
- Vercel serverless API routes for site fetching, Stripe checkout, billing portal, and webhooks.
- Stripe subscription billing (Free, Pro, Business tiers).
- SuperAdmin Dashboard with user management and growth metrics.
- Analysis History with database persistence.
- Competitive Duel mode for head-to-head website comparison.
- Implementation Roadmap with JSON-LD code snippets (Pro feature).
- Press Kit with blog post, press release, and social media templates.
- SEO component with OpenGraph, Twitter Cards, and JSON-LD structured data.
- Marketing Landing page with personas, FAQ, and testimonials.
- Custom domain `aeoanalyzers.com` with Vercel SSL.
- GitHub CI/CD with auto-deploy on push to main.
