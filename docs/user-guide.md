# AEO Analyzers: User Guide
## Getting Maximum Value from the Answer Engine Era

Welcome to AEO Analyzers. This guide will help you understand how to optimize your website for the next generation of search: **Answer Engines** (like Gemini, ChatGPT, and Perplexity).

### 1. Understanding the AEO Score
Your **AEO Score** (0-100) is a composite metric that measures how "digestible" your content is for AI agents. The score is fully transparent — built from four pillars:

**Score = Entity × 0.3 + Density × 0.3 + Clarity × 0.2 + Structure × 0.2**

- **Entity (30%)**: Schema.org presence, OpenGraph tags, entity identity clarity
- **Density (30%)**: Statistics, percentages, citable facts density
- **Clarity (20%)**: How directly and clearly the content answers questions
- **Structure (20%)**: Semantic HTML quality, heading hierarchy

Score ranges:
- **80-100**: Excellent. AI agents can easily parse and cite your site.
- **50-79**: Good, but needs improvement in structured data or clarity.
- **Below 50**: Poor. AI agents may struggle to find or trust your content.

### 2. The Citation Probability Metric
This is our most critical metric. It predicts the likelihood of an AI agent attributing a claim to your website.
- **How to improve it**: Use clear, authoritative language. Add specific facts, statistics, and technical specifications. Ensure your site has strong structured data and trust signals.

### 3. Six Advanced Diagnostics
Every analysis includes six deep-dive features:

1. **Citation Hook Density** — Counts statistics, percentages, and citable facts. Surfaces the top 3 most quotable sentences from your content.
2. **E-E-A-T Author Audit** — Checks for author attribution, Schema.org/Person tags, LinkedIn links, and credentials. Flags generic authors ("Admin", "Staff"). Trust signal scoring (0-100).
3. **LLM Summarization Test** — Compares what your meta title/description says the page is about vs. what AI actually understands. Rates alignment as Aligned / Vague / Misaligned.
4. **Zero-Click Predictor** — Identifies text blocks that should be tables or lists for Featured Snippets. Snippet readiness scoring (0-100).
5. **Query-to-Content Gap** — Generates the top 10 questions users in your niche would ask AI, and checks whether your content answers them (Strong / Partial / Missing).
6. **Semantic Chunking** — Finds content blocks over 150 words without proper headings. Suggests specific headings. Chunking score (0-100).

### 4. Enhanced Actionable Reports (v1.3)
Every analysis now generates specific, deploy-ready outputs:

- **Comprehensive JSON-LD Schema** — A complete OfferCatalog listing ALL detected products, services, and capabilities. Ready to paste into your site's `<head>` section. This replaces the basic single-service snippet with full coverage.
- **Content Rewrite Examples** — 3-5 before/after rewrites from your actual content, replacing vague marketing language with specific, AI-citable claims.
- **Meta Description Rewrite** — Your current meta description vs. a suggested rewrite with technical specifics instead of marketing fluff.
- **Implementation Checklist** — 5-8 categorized actions (Technical, Authority, Structural, Editorial, Coverage) with High/Medium/Low priority tags.

### 5. Using the Competitive Duel
The **Competitive Duel** is your secret weapon.
- **Step 1**: Enter your URL.
- **Step 2**: Enter a competitor's URL.
- **Step 3**: Analyze the **Verdict**.
- **Action**: Look at the score breakdown to see where your competitor is beating you (e.g., they might have better Schema.org implementation or higher factual density).

### 6. Downloading the Professional Report
Click the **"Download Report"** button in the Implementation Roadmap to generate a professional Word document (DOCX). The report includes:

- Title page with your name, URL, date, AEO Score, and Citation Probability
- Executive Summary and Score Breakdown
- Areas of strength and weakness with priorities
- Implementation instructions (JSON-LD, content architecture, semantic HTML, content guidance)
- Platform-specific guides (WordPress, Shopify, HubSpot, Wix, Custom Code)
- All 6 advanced diagnostics
- **Appendix A**: Comprehensive JSON-LD Schema (ready to deploy)
- **Appendix B**: Content Rewrite Examples table
- **Appendix C**: Meta Description Rewrite
- **Appendix D**: Knowledge Gap Action Table
- **Appendix E**: Implementation Checklist with priority tags

The report is generated entirely in your browser — no data leaves your machine.

### 7. Using the Handoff Template
The **Handoff** tab provides a copy-paste email template you can send directly to your web team or agency. It includes all findings, the comprehensive schema, content rewrites, knowledge gap FAQ, implementation checklist, and rollout plan — everything needed to implement the changes.

### 8. Managing Your Account
- **Sign Up / Log In**: Create an account using email or Google OAuth via our secure authentication system powered by Supabase.
- **Subscription Tiers**: Upgrade from Free to Pro ($49/mo) or Business ($199/mo) to unlock the Implementation Roadmap, DOCX reports, and unlimited analyses.
- **Analysis History**: All your past analyses are saved and accessible from your dashboard, so you can track AEO score improvements over time.
- **Billing Management**: Access the Stripe billing portal from your account settings to manage your subscription, update payment methods, or view invoices.

### 9. Best Practices for AEO
- **Direct Answers**: Structure your content with clear headings (H1, H2) and direct answers to common questions.
- **Structured Data**: Always use Schema.org (Service, Product, FAQPage, Organization, OfferCatalog).
- **Specific Language**: Replace marketing adjectives with metrics, protocols, and technical specifications.
- **Authoritative Tone**: AI models favor content that sounds expert and objective.
- **Semantic HTML**: Use `<main>`, `<article>`, `<section>`, `<nav>` — not just `<div>` tags.
- **Mobile Speed**: AI crawlers prioritize fast-loading sites.

---
*For support, visit your dashboard at [aeoanalyzers.com](https://www.aeoanalyzers.com) or contact our support team.*
