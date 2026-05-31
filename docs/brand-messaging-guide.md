# AEO Analyzers — Brand & Messaging Guide (single source of truth)

*The canonical system every announcement, blog, post, ad, and web page should
pull from, so the brand is consistent and every piece drives action — not a
scroll-by. Updated 2026-05-31. Pair with: `master-announcement.md` (posts),
`go-to-market-plan.md` (plan), `image-prompt-playbook.md` + `visual-canon.md`
(visuals), `blog-relaunch-2026.md` (flagship article).*

---

## 1. One-line positioning
**AEO Analyzers shows you — in 90 seconds — whether AI engines cite your business, and exactly how to fix it. Be the answer AI gives.**

## 2. Primary tagline + supporting lines
- **Tagline:** *Be the answer AI gives.*
- **Descriptor:** *Multiple AI engines. One score. 90 seconds.*
- **Must-have line:** *If you want your business found in the era of AI agents and answer engines, Answer Engine Optimization is the new must-have.*
- **The shift (use to reframe SEO):** *SEO got you onto the page. AEO decides whether you ARE the answer. Ranked is not the same as cited.*

## 3. The core narrative (every story follows this arc)
**Problem → Stakes → Solution → Proof → Action.**
1. **Problem:** Customers now ask AI and read one answer, assembled from the few sources AI trusts.
2. **Stakes (the hook):** If a competitor is cited and you're not, you lose the customer **invisibly** — it never shows in your analytics. AI search is zero-sum: one answer, one cited source.
3. **Solution:** AEO Analyzers simulates how Gemini, ChatGPT, and Perplexity see you, scores it, and hands you the exact fixes.
4. **Proof:** Measurable (AEO score + Citation Probability), brand-aware, provenance-safe, deploy-ready — and we dogfood it on our own site.
5. **Action:** Run a free audit on your site, then your competitor. The gap is what AI is using to choose between you — today.

## 4. Audiences + the pain each feels (lead with the pain)
- **Marketing teams / CMOs:** "Rankings hold, leads slide — AI recommends competitors and you can't see the loss."
- **Web admins / developers:** "We need accurate, deploy-ready fixes — not vague advice we have to re-check."
- **Founders / SMB:** "When someone asks AI about my space, does it name me or a competitor?"
- **Agencies:** "Clients ask why they're not in ChatGPT/Gemini; turn that into a billable, concrete roadmap."
- **Ecommerce:** "Smaller store, stronger reviews — but AI cites the big retailer."
- **Public sector / authority:** "AI summarizes outdated third-party pages instead of our official guidance."

## 5. USPs — why different, why better (each tied to an OUTCOME)
1. **Never paste a lie into your site.** Verified (safe-to-paste, source-quoted) vs. Candidate (verify-first) schema. → *You never publish a fabricated fact AI will learn.*
2. **Brand-aware advice.** Editorial/SaaS/ecommerce each get the right playbook; editorial voice is protected. → *Recommendations that fit your business and don't erase your voice.*
3. **Truthful gaps.** Distinguishes "absent" from "present-but-unschematized"; no advice for features you don't have. → *Wrap content, don't rewrite it; no busywork.*
4. **The cure, not just a score.** Paste-ready JSON-LD, rewrites, checklist, Word report, web-team handoff. → *You leave with the fix, deployable today.*
5. **See the invisible competition.** Multi-engine simulation + Citation Probability + head-to-head Competitive Duel. → *You see exactly where a rival wins the citation.*
6. **We dogfood it.** We made our own site AI-visible. → *Built by people who live the problem.*
7. **90 seconds vs hundreds of hours.** → *Specialist-grade audit at SaaS speed and price.*

## 6. Benefits (what's in it for them — outcome words)
Get cited by AI · stop losing customers you can't see · prove marketing impact with a repeatable score · hand your developer a deploy-ready fix · protect your brand voice · beat a named competitor to the citation · fix one site today for $24, no subscription.

## 7. Features (capabilities)
0–100 AEO score (Entity/Density/Clarity/Structure) · Citation Probability · Competitive Duel · brand-type detection · provenance-split JSON-LD · honest OfferCatalog · Citation Hook Density · E‑E‑A‑T audit · LLM Summarization Test · Zero-Click/Snippet Predictor · Query-to-Content Gap (incl. "schema-only") · Semantic Chunking · content rewrites · meta rewrite · implementation checklist · Word (.docx) report · web-team handoff · analysis history.

## 8. CTA system — make people act, not scroll
- **Primary CTA (always):** **"Run your free audit → aeoanalyzers.com"** (or "Get your free AEO score").
- **Comparison CTA (high-converting):** **"Now run it on your top competitor. The gap between the two scores is the gap AI is using to choose between you."**
- **Low-commitment CTA:** **"Only have one site? $24 Day Pass — fix it today, no subscription."**
- **Action psychology (use honestly):** name the *invisible* loss ("you're losing deals you'll never see"), make it *zero-risk* ("free, 90 seconds, no signup to see your score"), make it *specific* ("see your number, then your competitor's"), and give a *next step* ("here's the exact fix"). End every asset with ONE clear action.

## 9. Voice & tone
Confident, plain-English, credible, calm-urgent (urgency from the real shift, not hype). Specific over salesy. No jargon walls. One idea per sentence in headlines.

## 10. Accuracy guardrails (non-negotiable)
- **No invented outcome stats** ("+X% traffic", "10x leads") and **no internal economics** (margins, per-user cost) in public copy/visuals until we have real, citable data.
- Use only **true product facts** (90 seconds, 0–100, 3 engines, free/$24) and the **market shift**.
- **Testimonials** must be founder-true or clearly labeled "illustrative/representative" — never fabricated named-customer endorsements (FTC). Remove the fabricated AggregateRating in `json-ld.ts` before scaling.
- Avoid unsubstantiated superlatives ("Official", "world's first").

## 11. Canonical assets (use these, don't recreate)
- **OG / social card:** `public/aeo-og.png` ("Be the Answer AI Gives" — also at `images/launch-canon/aeo-og-be-the-answer.png`). Old OG filenames (`aeo-og-preview.jpg`, `images/og-image.jpg`) now serve this same image; originals archived in `images/_archive/`.
- **Image library:** `images/launch-canon/` (34 canonical PNGs) — see `master-announcement.md` for the per-post map and `image-prompt-playbook.md` to regenerate.
- **Real screenshots:** `images/marketing/launch-<date>/` (product proof + exact-dimension social cards).
- **Posts ready to paste:** `docs/master-announcement.md` → also the Word doc `AEO-Analyzers-MASTER-Announcement.docx`.
- **Plan & cadence:** `docs/go-to-market-plan.md`.

## 12. Boilerplate (paste at the end of articles / about blurbs)
> AEO Analyzers helps brands become the cited source of truth in AI answers. In about 90 seconds it shows how Gemini, ChatGPT, and Perplexity perceive your site, scores your Citation Probability, and gives you the exact, deploy-ready fixes. Free to try. Be the answer AI gives — https://www.aeoanalyzers.com · PI GenAI LLC.
