# AEO Analyzers v1.3: Enhanced Actionable Reports & Comprehensive JSON-LD

**By Lindsay Hiebert, Founder of AEO Analyzers**
*March 30, 2026*

---

## The Problem We Solved

AEO Analyzers v1.2 told you *what was wrong*. But when you handed the report to your web team, they still had to figure out *exactly what to do*. The schema snippet covered one service. The recommendations were generic. The content guidance said "be more specific" without showing you what "specific" looks like.

v1.3 closes that gap. Every report is now specific to YOUR content, with deploy-ready code, before/after examples from YOUR actual pages, and a prioritized checklist your team can execute without guessing.

---

## What's New

### 1. Comprehensive JSON-LD Schema — Every Product & Service

The old schema snippet generated a single `@type Service` entry. Useful, but incomplete.

v1.3 generates a **complete `OfferCatalog` JSON-LD** listing every product, service, and capability detected on your page. Each entry uses industry-standard terminology (not marketing adjectives) and includes technical descriptions.

If the Query-to-Content Gap analysis found "Missing" topics, those are mapped into additional schema entries — so your structured data preemptively covers the questions AI is asking that your content doesn't yet answer.

The output is a valid `<script type="application/ld+json">` block, ready to paste into your site header.

### 2. Content Rewrite Examples — Before/After From Your Actual Content

Generic advice like "use more specific language" doesn't help a marketing team. They need to see what specific looks like.

v1.3 identifies 3-5 sentences from YOUR page that use vague marketing language and rewrites each one:

- **Current (Low Citation):** "Our cutting-edge platform delivers industry-leading results"
- **Proposed (High Citation):** "Our platform processes 50,000+ queries/day with 99.7% uptime using distributed PostgreSQL clusters"

These aren't hypothetical examples. They're pulled from the actual analyzed content, with the page section identified.

### 3. Meta Description Rewrite

Your meta description is the first thing AI reads when deciding whether to cite your page. Most meta descriptions are marketing copy — "The best solution for your needs."

v1.3 extracts your current meta description and proposes a specific rewrite under 160 characters, replacing marketing fluff with technical specifics that AI systems prefer to quote.

### 4. Implementation Checklist — Categorized & Prioritized

Instead of a flat list of recommendations, v1.3 delivers a structured checklist:

- **Categories:** Technical, Authority, Structural, Editorial, Coverage
- **Priorities:** High, Medium, Low
- **Specificity:** Each item references actual findings from the analysis

Example: `[HIGH] Technical: Paste the comprehensive JSON-LD into the site header to cover all 12 detected service offerings`

### 5. Five New DOCX Appendix Sections

The downloadable Word document now includes:

| Appendix | Contents |
|----------|----------|
| **A: Comprehensive Schema** | Full JSON-LD in monospace font, ready to copy |
| **B: Content Rewrite Examples** | Table: Page / Current (Low Citation) / Proposed (High Citation) |
| **C: Meta Description Rewrite** | Current vs. Suggested |
| **D: Knowledge Gap Action Table** | Question / Status / Required Action for every gap question |
| **E: Implementation Checklist** | Color-coded priority items by category |

### 6. Enhanced Handoff Email

The copy-paste handoff template now includes the comprehensive schema, content rewrite examples, knowledge gap FAQ, and implementation checklist — everything your web team needs in a single email.

---

## Why This Matters

The difference between v1.2 and v1.3 is the difference between a diagnosis and a treatment plan.

- v1.2: "Your schema is incomplete." v1.3: "Here's the complete schema. Paste it."
- v1.2: "Your content uses vague language." v1.3: "Change *this sentence* to *this sentence*."
- v1.2: "You're missing coverage on key topics." v1.3: "Here are the 8 questions, their status, and what to write for each one."

Every report is now a complete implementation specification. Hand it to a developer and the work gets done — no interpretation required.

---

## Backward Compatibility

All new fields are optional. Existing analysis history records render exactly as before. The new appendix sections only appear when the data exists. The basic `schemaSnippet` remains as a fallback if the comprehensive schema isn't available.

---

## Try It Now

Run a new analysis at **[aeoanalyzers.com](https://www.aeoanalyzers.com)** and download the report. You'll see the comprehensive schema, content rewrites, and implementation checklist in both the UI and the DOCX.

---

*Lindsay Hiebert is the founder of AEO Analyzers, the AI-powered Answer Engine Optimization platform (powered by Google Gemini 3.5). Learn more at [aeoanalyzers.com](https://www.aeoanalyzers.com).*
