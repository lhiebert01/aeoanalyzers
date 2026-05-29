# AEO Analyzers v1.4 — Launch Plan & Messaging Assets

*Owner: Lindsay Hiebert · Target launch: week of 2026-06-01 · Theme: "Trustworthy AEO"*

---

## 1. Positioning

**One-liner:** AEO Analyzers shows you — in 90 seconds — whether AI engines trust your site enough to cite it, and exactly what to fix if they don't.

**v1.4 angle:** The audit you can hand straight to your web team without re-checking it. Brand-aware, provenance-safe, no false flags.

**Category:** Answer Engine Optimization (AEO) — the must-have layer above SEO for the AI-search era.

---

## 2. Core messaging pillars

| Pillar | Message | Proof point |
|---|---|---|
| **Invisible loss** | When AI recommends a competitor, the customer never reaches you — and it never shows in your analytics. | Zero-click AI answers; Citation Probability metric |
| **Trustworthy** | A report a founder can't catch making a basic mistake. | Provenance-safe schema; brand-aware advice; "Schema only" category |
| **Fast & cheap** | 100+ hours of specialist work in 90 seconds, for a subscription. | Full audit + deploy-ready JSON-LD + DOCX handoff |
| **Right advice for your business** | Editorial, SaaS, ecommerce — each gets the correct playbook. | Brand-type classifier; voice protection |

---

## 3. Audience segments & the hook for each

- **Digital marketing teams / CMOs:** "Your competitors are being cited by AI for queries you used to own. You can't see it in analytics — but your pipeline feels it."
- **SEO/AEO agencies:** "White-glove AEO audits at scale. Run it on every client, hand them a deploy-ready report, bill the strategy."
- **SaaS founders:** "When someone asks ChatGPT for 'the best tool for X,' is it you? Find out, then fix it in a day."
- **Publishers / editorial brands:** "Finally, an AEO tool that protects your voice instead of corporatizing it — and tells you the schema that gets you into AI answers."
- **Ecommerce:** "Product schema, reviews, and citable specs are how AI picks what to recommend. See where you stand."

---

## 4. Channel plan & sequence

1. **Blog post** (`blog-v1.4-trustworthy-aeo-launch.md`) — publish on site + Medium/LinkedIn article. Hero image #1.
2. **LinkedIn announcement** (founder post) — personal story of the 5 mistakes we fixed. Image #2 (the "5 fixes" carousel) or #3.
3. **Email to existing users** — "v1.4 is live: your reports just got trustworthy." CTA: re-run your audit.
4. **X/Twitter thread** — 6 tweets, one per fix. Image #4 per tweet optional.
5. **Product Hunt / community** (optional) — "AEO audit that AI-proofs your brand." Hero image #1 + GIF of a live audit.
6. **Cold/warm outreach to agencies** — short Loom + the blog link.

---

## 5. Ready-to-use copy

### LinkedIn (founder post)
> We built an AI tool to audit websites for AI search. Then we ran it on a brand we respected — and it made five mistakes a smart founder would catch in five seconds.
>
> It told an editorial brand to rewrite its voice into corporate jargon. It generated schema with invented facts. It flagged content as "missing" that was right there on the page.
>
> So we rebuilt the part that matters most: trust. AEO Analyzers v1.4 is the audit you can hand straight to your web team without re-checking it.
>
> • Brand-aware — editorial, SaaS, ecommerce each get the right advice
> • Provenance-safe schema — never paste an invented fact into your site
> • No false "missing" flags — it knows the difference between absent and unschematized
>
> AI search is zero-sum. One answer, one cited source. If it's not you, it's your competitor — and you'll never see the lost deal in analytics.
>
> Run a free audit on your site and your top competitor 👉 aeoanalyzers.com

### Email subject lines (A/B)
- "Your AEO report just got trustworthy (v1.4 is live)"
- "We fixed the 5 mistakes hiding in most AI audits"
- "Is AI citing you — or your competitor? Re-run your audit"

### Email body (short)
> AEO Analyzers v1.4 is live. We rebuilt the report around one goal: you should be able to hand it straight to your developer without second-guessing a single line.
>
> What's new: brand-aware advice (your voice is protected), provenance-safe schema (no invented facts), honest service detection, a new "Schema only" category that saves you from writing duplicate content, and calibrated scoring on Google's latest Gemini 3.5 model.
>
> Re-run your audit — your score and recommendations are sharper now. [Audit my site →]

### X/Twitter thread skeleton
1. AI search is zero-sum. One answer. One cited source. If it's not you, it's your competitor — and analytics never shows the loss. 🧵
2. We ran our own AEO tool on a brand we admired. It made 5 mistakes a founder would catch instantly. v1.4 fixes all of them.
3. Fix #1 — Brand-aware. It won't tell an editorial brand to sound like a SaaS landing page. Your voice is a moat.
4. Fix #2 — Provenance-safe schema. Verified (safe to paste) vs Candidate (verify first). Never paste an invented fact into your <head>.
5. Fix #3–5 — Honest service lists, "Schema only" vs truly missing, and zero advice about features you don't offer.
6. 90 seconds. Deploy-ready report. Free to try 👉 aeoanalyzers.com

### Taglines (pick per asset)
- "Be the answer AI gives."
- "The AEO audit you can actually trust."
- "100 hours of AEO work. 90 seconds."
- "If AI doesn't cite you, your competitor wins — invisibly."

---

## 6. Success metrics
- Free audits run (week 1 vs baseline)
- Free → paid conversion on Pro ($49) / Business ($199)
- Re-runs by existing users (engagement with v1.4)
- Agency signups / multi-site usage
- Blog + LinkedIn reach, audit click-through rate

---

## 7. Launch checklist
- [ ] Blog published on site + LinkedIn article + Medium
- [ ] Hero + supporting images generated and placed in `/public/images/blog/` (see `image-prompts-v1.4.md`)
- [ ] OG image updated/verified for the new post
- [ ] Email sent to existing user list
- [ ] LinkedIn + X posts scheduled
- [ ] `git tag v1.4.0` created and pushed
- [ ] Smoke-test live: run an audit, download the DOCX, confirm Verified/Candidate schema render
