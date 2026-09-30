# WO-AEO-BLOG-ONE-QUESTION-001 — Publish "One Question Is Not a Measurement"

FOR THE AEO-APP1 SESSION

Issued: 2026-09-30 by Lindsay Hiebert (founder)
Repo: aeoanalyzers.com (Vercel project prj_bV4G85yj3kQRujkcvTAvwhNMzpqW, prod branch main)
Content: one-question-is-not-a-measurement.md (in this zip, final copy, founder-reviewed)

## 0. Freeze status and how this WO runs

- GTM-90 maintenance mode until 2026-11-01. This WO is content/config only (no product code) and is GTM-90-compliant.
- Build on the review-gated branch (gtm-drafts-aug13 or a fresh content branch) behind noindex on an SSO-gated Vercel preview. Public/ files ride every deploy, so the noindex guardrail is mandatory until go.
- Publish to production only on the founder's plain "go" to the yes/no question in section 5.
- Standing close-out rule: no ✅ without cache-busted external fetch proof, Vercel deployment ID and commit hash. Repo state is not production state.
- No wake words. Founder stops with "hold".

## 1. Deliverables

1. Blog post at /blog/one-question-is-not-a-measurement built from the .md in this zip, on the existing blog post template (same as /blog/why-ai-doesnt-mention-you). Copy is final; do not reword. Fix only markdown-to-HTML rendering issues.
2. Page header line: "AEO Analyzers · Category education · Last reviewed 2026-09-30".
3. Meta title: "One Question Is Not a Measurement | AEO Analyzers". Meta description = the description field in the .md front matter. Canonical = https://aeoanalyzers.com/blog/one-question-is-not-a-measurement.
4. Article JSON-LD (Article, author Person Lindsay Hiebert with sameAs from the canonical entity fact sheet, publisher PIGENAI LLC org @id, datePublished on publish day, dateModified same). Answer-first H2s are already question-shaped; no FAQPage schema.
5. OG image 1200x630 and hero 1600x900 in the buyer-series visual style (/img/buyer-series/). Suggested concept: one bar labelled "1 question × 12 runs" beside a 3×4 grid labelled "12 questions × 4 engines"; headline "One question is not a measurement." OG alt text describes the image only, no claims.
6. Blog index card on /blog/, placed between "Why AI still doesn't mention your business" and "How AEO Analyzers works":
   - Label: Category education
   - Title: One question is not a measurement
   - Meta: September 2026 · 5-minute read
   - Blurb: The one-minute AI visibility test tells you whether you win one question, not which questions you could win. Why buyer questions across three segments and four engines are the smallest unit that produces a plan, with a worked example where two tests agreed on zero and only one explained why.
   - CTA: Read the piece →
7. Cross-link: on /what-should-an-aeo-tool-do, under the section "Why is one run not a measurement?", add one line: "Next read: One question is not a measurement" linking to the new post.
8. llms.txt: add the new post to the blog list. Sitemap entry.
9. G7 propagation checklist generated (this WO edits published body text on /what-should-an-aeo-tool-do and /blog/). Syndication (Substack, Medium, LinkedIn) is founder-run and out of scope here; the checklist lists the surfaces only.

## 2. Copy rules enforced (do not violate in any edit)

- Standing rule Sep 18: no tool, person, company or practitioner named or knocked. The competing test is described as a method only.
- Worked example stays anonymized. Do not name the company. Numbers are stored-run numbers from the two Sep 30 sweeps (found by name 100% N=8; category 0% N=28 search-grounded; three of four engines model-prior on the broad question). Nothing model-authored.
- Transparency doctrine: principles only. No thresholds, prompts, classifier internals, fixture names.
- No AEO Score numbers, no self-scored duel results (Aug 1 decision).
- Links are bare https URLs, no UTM, no wrappers.
- No em dashes added to body copy.

## 3. Out of scope

Product code, report templates, sweep logic (see WO-AEO-REPORT-POLISH-001 for those). Any change to the gtm-drafts-aug13 drafts already queued.

## 4. Sizing

~2 hrs including images. One outcome test: post renders, index card present, cross-link present, noindex present on preview and absent on production after go.

## 5. Plain yes/no question for the founder (default shown)

1. Publish to production once the preview passes review? Default: NO (hold on the gated preview until the founder replies go).

## 6. Close-out format

Commit hash · Vercel deployment ID · cache-busted fetch of the post URL showing the H1 and the header line · fetch of /blog/ showing the card · fetch of /what-should-an-aeo-tool-do showing the cross-link · noindex status · G7 checklist attached.
