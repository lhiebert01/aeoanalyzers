# WO-AEO-EXECREPORT-001 — AI Visibility Executive Report (Product + Outreach Generator)
**Product:** AEO Analyzers (aeoanalyzers.com) · **Stack:** Next.js / Supabase / Stripe / Vercel · Claude API for narrative generation
**Goal:** Productize the Mazda-style courtesy assessment as (a) a $250 self-serve "AI Visibility Executive Report" and (b) a super-admin outreach generator producing watermarked courtesy versions — one engine, two doors.
**Positioning guardrails (non-negotiable, from prior WOs):** first-party truth-record approach only; no parasite-SEO tactics ever recommended in any report; consequences-not-directives report voice; every number reproducible by the customer ("Every number we show you, you can reproduce yourself").
**Sequencing:** build AFTER WO-AEO-DOGFOOD-001 and WO-AEO-ADDENDUM-002 items in flight are stable — this WO consumes the sweep engine as-is; it does not modify it.

---

## Instructions to Fable (Claude Code CLI)
- One phase per session; commit as `WO-AEO-EXECREPORT-001 Phase N: <summary>`.
- Migrations additive only. No new dependencies without listing at session start.
- The report template is sacred: narrative sections are generated, but structure/section order matches the approved Mazda sample exactly. Template lives at `/templates/exec-report/` and is versioned.
- HARD RULE: nothing is ever emailed or exposed to a recipient without passing the human review queue (Phase 4). No fully-automatic sends, no exceptions, including admin outreach.

---

## Phase 1 — Report Template Engine

### 1.1 Template
- [ ] Port the approved Mazda sample (email + 2-page report) into `/templates/exec-report/template.md` with typed slots:
  `{brand}, {domain}, {sweep_date}, {headline_finding}, {branded_score_table}, {category_win_table}, {query_breakdown}, {authority_gap_list}, {own_domain_citation_count}, {competitor_citation_counts}, {crawler_status_note}, {recommendations[5]}, {sender_block}`
- [ ] Section order fixed: Email → Why this matters → Findings 1–5 (good news first, headline wound second) → Five recommendations → Next step.
- [ ] Two variants from one template: **PAID** (no watermark, full transcripts appendix link) and **COURTESY** (every page header/footer: "SAMPLE — Courtesy Assessment · aeoanalyzers.com"; transcripts summarized, not linked).

### 1.2 Narrative generation
- [ ] Input: sweep result JSON (existing engine output). Claude API call generates ONLY the narrative slots ({headline_finding}, plain-English findings prose, {recommendations}); all numbers/tables are computed server-side from the JSON and injected — the model never invents or restates a metric.
- [ ] Generation prompt encodes the house voice: plain English, executive register, good-news-first framing, consequences-not-directives, POSSE-only syndication advice, zero parasite-SEO suggestions (blocklist check on output: reject drafts containing gray-hat tactic recommendations).
- [ ] Headline-finding selector: rank category queries by (miss rate × strategic weight); the worst defensible gap becomes the subject line and Finding 3, mirroring the "most reliable small SUV" pattern.
- [ ] Output: report.md + rendered PDF (existing PDF pipeline) stored in Supabase storage under `reports/{report_id}/`.

### 1.3 Acceptance
- [ ] Regenerating from the archived Mazda sweep JSON reproduces a report substantively equivalent to the approved sample (structure identical; numbers identical; prose comparable).

## Phase 2 — Stripe Product & Purchase Flow ($250 self-serve)

- [ ] Stripe Product: "AI Visibility Executive Report" — $250 one-time. (Name per positioning decision; keep SKU `exec-report-v1`.)
- [ ] Purchase page `/executive-report`: what's included (60-run sweep across 4 engines, competitor citation tracking, authority-gap analysis, exec narrative, 5 prioritized actions, transcripts), 48-hour delivery promise, Mazda-style sample excerpt (watermarked), FAQ.
- [ ] Checkout collects: domain, brand name, up to 3 competitor domains, optional custom category queries (else auto-generated from site analysis), recipient email.
- [ ] `invoice.paid` webhook → creates `report_orders` row (status: `queued`) → triggers sweep run → generation → status `review` → lands in admin review queue. Customer gets "in progress, delivery within 48h" email.
- [ ] Refund path documented: sweep cost is sunk (~$1); refund policy = full refund pre-delivery, none post-delivery.

## Phase 3 — Super-Admin Outreach Generator (the Mazda motion)

- [ ] Admin panel section **Outreach**: form = target domain, brand, competitor list, category queries, recipient title/company (names added manually later) → runs sweep → generates COURTESY variant → status `review`.
- [ ] Outreach email draft auto-generated alongside (subject line from headline finding; no-strings courtesy framing per template Part 1) — draft only, never sent by the system; admin copies into own mail client after review.
- [ ] `outreach_log` table: target, date, sweep cost, report link, status (drafted/sent/replied/converted) — the outreach CRM-lite.
- [ ] Rate/cost guard: confirm dialog shows estimated sweep cost before run; monthly outreach sweep budget cap in settings.

## Phase 4 — Human Review Queue (gate for BOTH doors)

- [ ] Admin queue lists reports in `review`: side-by-side sweep JSON vs generated report; inline edit of narrative slots; regenerate-section button.
- [ ] Approve → PAID: delivery email with PDF + transcripts link, status `delivered`; COURTESY: report finalized + email draft surfaced for manual send, status `approved`.
- [ ] Reject → notes field → regenerate. Nothing leaves the system from any other state.
- [ ] Every delivered/approved report's Recommendation 5 links to monitoring subscription page (the built-in upsell).

## Phase 5 — Portfolio & Site Integration

- [ ] Add to product portfolio page + pricing page: Free snapshot → $250 Executive Report → Monthly monitoring (the ladder, visually).
- [ ] Free snapshot CTA ends with Executive Report upsell; Executive Report delivery email ends with monitoring upsell. Ladder enforced in copy everywhere.
- [ ] JSON-LD: `Product` + `Offer` ($250) on `/executive-report` (dogfooding — this page must score ≥ 95 on our own analyzer).
- [ ] Analytics events: snapshot→report purchase conversion, report→subscription conversion, outreach sent→reply→converted.

## Definition of done
- [ ] Mazda-JSON regeneration test passes (1.3)
- [ ] End-to-end paid flow verified in Stripe test mode: checkout → sweep → generation → review → approve → delivery email received
- [ ] End-to-end outreach flow verified: admin form → courtesy report → review → approved draft (system never sends)
- [ ] Watermark present on all COURTESY renders; absent on PAID
- [ ] Gray-hat blocklist check demonstrably rejects a seeded bad draft
- [ ] /executive-report scores ≥ 95 on AEO Analyzers itself
