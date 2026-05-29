# Image Prompts — v1.4 Launch & Blog Assets

Generation-ready prompts for hero and in-article images. Each is tied to specific
content in `blog-v1.4-trustworthy-aeo-launch.md` and the launch plan. Use any
image model (Midjourney, DALL·E 3, Imagen, Ideogram for text-in-image).

## Brand style (apply to every prompt)
- **Palette:** deep ink navy (#1a1a2e) + near-black, with a single accent (emerald #16a34a for "verified/positive", amber #ca8a04 for "verify/caution"), generous white space.
- **Aesthetic:** clean, modern SaaS, editorial-grade, lots of negative space, subtle grid, soft depth. NOT clip-art, NOT busy, NOT neon-cyberpunk.
- **Type-in-image:** prefer Ideogram/DALL·E when words must render correctly. Keep on-image text to ≤6 words.
- **Aspect ratios:** Hero/OG = 1200×630 (1.91:1). In-article = 1600×900 (16:9). Social square = 1080×1080. LinkedIn carousel = 1080×1350.

## Where to save (see folder guide at bottom)
- Web-served, referenced by the site/blog → `public/images/blog/` (create this folder). URL becomes `/images/blog/<file>.jpg`.
- OG/social override for this post → `public/images/blog/v1.4-og.jpg`, then set in the post's `<SEO ogImage=... />`.
- Large source originals / non-deployed working files → repo-root `images/` (matches existing convention).

---

## A. v1.4 Launch blog — `blog-v1.4-trustworthy-aeo-launch.md`

### A1 — HERO / OG  (1200×630) → `public/images/blog/v1.4-og.jpg`
**Ties to:** title + "Be the answer AI gives."
> Minimalist hero graphic on a deep ink-navy background. Center: a single glowing answer card emerging from a cluster of faded, de-emphasized search-result links behind it, symbolizing "one AI answer replaces ten blue links." A subtle emerald check-mark badge on the answer card. Clean, lots of negative space, premium SaaS editorial style, soft volumetric light. Small bold sans-serif headline space top-left. No clutter. 1.91:1.

**On-image text (optional, Ideogram):** "Be the answer AI gives."

### A2 — "The five fixes"  (1600×900) → `public/images/blog/v1.4-five-fixes.jpg`
**Ties to:** "What's new in v1.4" / the five mistakes section.
> A clean editorial infographic, ink-navy on off-white, showing five numbered cards in a row: (1) a speech-bubble with a shield = "voice protected", (2) a document split into a green "verified" half and amber "candidate" half, (3) a filtered list with crossed-out jargon tags, (4) a magnifying glass over a paragraph with a small schema tag, (5) a question mark inside a "not applicable" circle. Flat, modern, minimal icons, consistent stroke weight, generous spacing. 16:9.

### A3 — Verified vs Candidate schema  (1600×900) → `public/images/blog/v1.4-provenance.jpg`
**Ties to:** "Provenance-safe schema — never paste a lie into your <head>."
> Two side-by-side code-card panels on dark navy. Left panel headed with a green "Verified — safe to paste" pill, showing tidy JSON-LD with a small green source-quote callout. Right panel headed with an amber "Verify before pasting" pill, showing JSON with a warning icon and a faint amber overlay. Monospace code aesthetic, crisp, high contrast, premium dev-tool look. 16:9.

### A4 — Zero-sum AI answer  (1080×1080) → `public/images/blog/v1.4-zero-sum.jpg`
**Ties to:** "AI answers are zero-sum" / invisible-loss pillar.
> A single spotlight beam from an abstract AI assistant icon landing on ONE brand card, while several other brand cards sit in the dark, unlit. Ink-navy background, one emerald spotlight, dramatic negative space, minimal. Conveys "winner takes the citation." Square.

---

## B. Evergreen / supporting (reusable across channels)

### B1 — "SEO → AEO" shift  (1600×900) → `public/images/blog/aeo-vs-seo.jpg`
**Ties to:** "Search didn't slow down. It changed owners."
> Split composition: left side a faded classic search-results list labeled subtly "then"; right side a single clean AI answer card labeled "now", an arrow morphing one into the other. Ink-navy + emerald accent, minimal, editorial. 16:9.

### B2 — 90 seconds vs 100 hours  (1080×1080) → `public/images/blog/90s-vs-100h.jpg`
**Ties to:** "100+ hours of specialist work in 90 seconds."
> A large "90s" on one side and a faded stack of "100 hrs" timesheets on the other, connected by a sleek progress ring nearly complete. Premium, minimal, ink-navy + emerald. Square.

### B3 — Live audit product shot  (1600×900) → `public/images/blog/product-audit.jpg`
**Ties to:** product CTA / Product Hunt / GIF still.
> A clean, abstracted product UI mockup of an AEO score dashboard: a big "91/100" gauge, four labeled sub-bars (Entity, Density, Clarity, Structure), and a small "editorial site" tag. Soft drop shadow on a light desk surface, modern SaaS screenshot style, not photorealistic browser chrome. 16:9.

---

## C. LinkedIn carousel (1080×1350 each) → `public/images/blog/carousel/`
Use the same five-fixes content as A2, one slide per fix, large number + 3-word label + one-line caption. Slide 0 = title ("AEO Analyzers v1.4 — Trustworthy AEO"), slide 6 = CTA ("Run a free audit → aeoanalyzers.com"). Consistent ink-navy template, emerald accents.

---

## Folder guide (where image assets live in this repo)

| Purpose | Folder | Notes |
|---|---|---|
| **Deployed, web-referenced images** | `public/` (root) and `public/images/` | Served at the site root. `public/aeo-og-preview.jpg` is the current site-wide OG (1200×630). `public/images/og-image.jpg` exists too. **Create `public/images/blog/` for these new assets** — they'll be available at `/images/blog/<file>`. |
| **Site-wide OG image** | `public/aeo-og-preview.jpg` | Referenced in `index.html`, `src/components/SEO.tsx` (`ogImage` default), and `src/lib/json-ld.ts`. Replace this file (keep the name) to change the global preview. |
| **Per-page OG override** | pass `ogImage="/images/blog/v1.4-og.jpg"` to `<SEO />` | `SEO.tsx` already supports an `ogImage` prop. |
| **Large source originals / working files** | repo-root `images/` | Existing convention (e.g. `AEO-Analyzer-OG-Image.jpeg`, `aeo-at-a-glance-*`). Not deployed; keep big masters here, export optimized copies into `public/images/blog/`. |

**Tip:** keep deployed images ≤ ~300 KB (JPG, 1200–1600 px wide). The current OG is ~366 KB — fine, but optimize new ones. Add `og:image:alt` text per post in `SEO.tsx`.
