# Release Notes

## v1.2.0 — March 30, 2026

### DOCX Report Download (Phase 1)
- **Professional Word Document:** One-click download of a full AEO Analysis Report as `.docx`, generated entirely in-browser
- **12-Section Report:** Title page (with user name, AEO Score, Citation Probability), Why This Matters, Executive Summary, Score Breakdown, Areas Needing Improvement, Areas of Strength, Top 3 Priorities, Implementation Instructions (A-D), Platform Instructions, Rollout Plan, Success Criteria, Full Recommendations
- **Dynamic Import:** DOCX generation uses `await import('docx')` for code-splitting — zero impact on initial page load (~11KB separate chunk)
- **Advanced Analysis Included:** All Phase 3 advanced features automatically appear in the report when data exists
- **"Prepared by" Attribution:** Report displays the user's display name from their Supabase profile

### Transparent AEO Score Formula (Phase 2)
- **Score Breakdown Card:** Visual 4-column grid showing Entity (30%), Density (30%), Clarity (20%), Structure (20%) sub-scores with progress bars
- **Formula Display:** `Score = E×0.3 + D×0.3 + C×0.2 + S×0.2` shown below the breakdown — fully transparent and verifiable
- **Gemini Prompt Updated:** AI now computes and returns all four sub-scores; overall score must equal the weighted formula (rounded)

### Advanced Analysis — Citation Hook Density (Phase 3a)
- **Factual Density Score (0-100):** Measures how rich content is with citable facts
- **Stats & Percentages Count:** Counts specific data points on the page
- **Top 3 Citable Sentences:** Surfaces the most quotable sentences from the content

### Advanced Analysis — E-E-A-T Author Audit (Phase 3a)
- **Author Detection:** Checks for author attribution, Schema.org/Person, LinkedIn links
- **Generic Author Flag:** Warns when author is "Admin", "Staff", "Team", etc.
- **Trust Signals & Warnings:** Lists all detected trust signals and flags E-E-A-T issues
- **E-E-A-T Score (0-100):** Overall trust signal composite

### Advanced Analysis — LLM Summarization Test (Phase 3b)
- **Metadata vs. Reality:** Compares what meta title/description says the page is about vs. what AI actually understands
- **Alignment Rating:** Aligned / Vague / Misaligned with explanation
- **Unique Differentiator:** No other tool tests whether AI "gets" what your page is really about

### Advanced Analysis — Zero-Click Predictor (Phase 3b)
- **Snippet Opportunities:** Identifies text blocks that should be tables or lists for Featured Snippets
- **Suggested Formats:** Recommends specific restructuring (table, ordered list, definition list) with reasoning
- **Featured Snippet Readiness (0-100):** Composite score for snippet optimization

### Advanced Analysis — Query-to-Content Gap (Phase 3c)
- **Top 10 Niche Questions:** AI generates the questions users in your industry would actually ask
- **Answer Quality Rating:** Each question rated Strong / Partial / Missing
- **Gap Score (0-100):** 100 = all questions answered strongly, 0 = none answered

### Advanced Analysis — Semantic Chunking (Phase 3c)
- **Long Block Detection:** Finds content blocks >150 words without proper headings
- **Suggested Headings:** AI proposes specific heading text for each long block
- **Chunking Score (0-100):** 100 = perfectly chunked, 0 = wall of text

### Advanced Analysis UI
- **New `AdvancedAnalysisCards.tsx` Component:** 6 cards in a responsive 2-column grid, each rendering only when its data exists
- **Design Consistency:** Matches existing app design (white bg, zinc borders, rounded-3xl, lucide icons, ScoreBadge components)
- **Backward Compatible:** Old history records render fine — new cards simply don't appear for records without advanced data

### Database Connectivity Fix
- **Cached Access Token:** REST API helpers (`supabaseQuery`, `supabaseInsert`, `supabaseUpdate`) no longer call `supabase.auth.getSession()` on every request — which was causing hangs in production
- **Token Set Once:** Access token cached via `setAccessToken()` during auth initialization; cleared on sign-out
- **Fixes:** History loading, Admin Dashboard user list, save-to-DB, usage count updates — all previously hanging

### Backward Compatibility
- All new `AnalysisResult` fields are optional (`?`) — old history records stored as JSON continue to render correctly
- No database schema changes required
- DOCX generator checks for field existence before adding sections

---

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
