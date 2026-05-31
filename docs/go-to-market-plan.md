# AEO Analyzers — Go-To-Market Plan (announce · market · sell)

*Owner: Lindsay Hiebert · Updated 2026-05-31 · Forward-looking; revise as you ship.*

The product is now fully live: accurate (v1.4), crawlable by AI (prerender),
and able to take money (Stripe + Day Pass). This plan turns that into demand.

---

## 1. The core narrative (use everywhere)

**AI search is zero-sum.** People ask Gemini/ChatGPT/Perplexity and read *one*
answer, assembled from the few sites the AI trusts. If a competitor is cited and
you're not, you lose the customer **invisibly** — it never shows in your
analytics. AEO Analyzers shows you, in 90 seconds, whether AI cites you and
exactly what to fix. **Be the answer AI gives.**

The trust wedge (v1.4): "an AEO report you can hand straight to your web team
without re-checking it." The dogfood proof: "we ran our own tool, found we were
invisible to AI, fixed it — here's the before/after."

---

## 2. Launch sequence (next ~2 weeks)

1. **Dogfood case study (highest priority).** Now that the prerender shipped,
   write "We were invisible to AI — here's how we fixed our own AEO" using the
   real before (empty SPA shell) / after (crawlable + JSON-LD) story. This is the
   most credible asset you have. Pairs with the v1.4 accuracy narrative.
2. **v1.4 "Trustworthy AEO" announcement** — publish `blog-v1.4-trustworthy-aeo-launch.md`
   on site + LinkedIn article + Medium. Use `launch-plan-v1.4.md` copy.
3. **Day Pass announcement** — short post: "Only have one site? $24, fix it today,
   no subscription." Targets the single-site majority.
4. **Email existing users** — "v1.4 is live + a $24 Day Pass; re-run your audit."
5. **Get listed where AI looks** — submit to AEO/GEO directories (LLMrefs 200+
   platform directory) and pitch inclusion in "best AEO tools 2026" listicles
   that currently surface competitors but not us (the audit found we were absent
   from our own category search). Those citations are how we enter the answer set.

---

## 3. Funnel & pricing (live today)

- **Free** = one full diagnosis (scores, gaps, brand type) — the hook. Fixes gated.
- **Day Pass $24 one-time / 24h** = the single-site buyer who won't subscribe.
- **Pro $49/mo** = freelancers / small teams.
- **Business $199/mo** = agencies / multi-site / growing SaaS.
- Conversion levers to add next: a one-time→subscription upsell after a Day Pass;
  "see your competitor's score" teaser to drive Competitive Duel.

---

## 4. Content / blog cadence (periodic, to compound SEO + AEO + authority)

Aim **2–4 posts/month**, each itself optimized for AI citation (clear Q&A
framing, JSON-LD, llms.txt already in place). Evergreen angles:

- **Educational (top of funnel):** "What is AEO and why SEO isn't enough in 2026",
  "How AI engines decide who to cite", "JSON-LD for non-developers".
- **Comparative:** "AEO vs SEO", "AEO Analyzers vs [competitor]" pages (the audit
  noted competitors own these listicles — claim the comparison terms).
- **Proof/case studies:** the dogfood story; anonymized customer before/afters;
  "we audited 10 [industry] sites — here's what AI sees."
- **Reactive/news:** when Google/OpenAI/Anthropic change ranking or ship AI search
  features, publish a same-week "what this means for your AI visibility" post.
- **Product:** each release → a short announcement (keep the v1.x blog pattern in
  `docs/blog-v1.x-*.md`).

Each post: hero image (see `docs/image-prompts-v1.4.md` for the brand style),
LinkedIn + X repost, and a CTA to a free audit.

---

## 5. Distribution channels

- **LinkedIn (primary)** — founder voice, the 5-mistakes/trust story, case studies.
- **X/Twitter** — release threads, quick "AI cited X not Y" demos.
- **Email** — existing users + a lead-capture on the free audit.
- **Directories & listicles** — AEO/GEO platform lists (citation source for our category).
- **Agencies** — outreach: "run it on every client, hand them a deploy-ready report."
- **Product Hunt** (optional) once the dogfood case study + a demo GIF are ready.

---

## 6. Metrics to watch

Free audits run · free→paid conversion (Pro/Business) · Day Pass purchases ·
re-runs by existing users · agency/multi-site signups · blog reach + audit
click-through · **our own** Citation Probability over time (publish it).

---

## 7. Next product work that supports selling

- **Confirm + harden payments** (first real purchase; then add the Day Pass→Pro upsell).
- **Public "AI visibility" leaderboard / shareable score** — virality + backlinks.
- **Scheduled re-audits + alerts** (justifies subscription vs one-time).
- **Per-page OG images** for blog posts (generate from the image prompts).
- **Lead capture before the free audit** (email = remarketing) — weigh against funnel friction.

---

## 8. Assets already prepared (reuse, don't recreate)

- `docs/blog-v1.4-trustworthy-aeo-launch.md` — launch announcement.
- `docs/launch-plan-v1.4.md` — positioning, audience hooks, ready-to-paste LinkedIn/email/X copy.
- `docs/image-prompts-v1.4.md` — hero/in-article image prompts + asset-folder guide.
- `public/llms.txt` — AI-readable product summary (live).
