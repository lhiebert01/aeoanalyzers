# AEO Analyzers — Visual Canon (image ↔ story mapping)

*Reviewed 2026-05-31. Maps our existing image library + live screenshots to the
article/post narrative: Struggle → Problem → Solution → Benefits/Authority → CTA.
Source images in `images/`; live screenshots in `images/marketing/launch-<date>/`.*

## Verdict per asset

| Asset | Verdict | Notes |
|---|---|---|
| `AEO-Analyzer-OG-Image(.jpeg/-small.jpg)` | ★ Canonical OG/hero | Phone + 88/100 + 75% + ChatGPT/Gemini + CTA. Clean, accurate. (Brand says "Analyzer" singular — ideally regenerate as "Analyzers".) |
| `aeo-storyboard-the-struggle-1.png` | ★ Keep | Narrative beat 1 — old tactics fail |
| `aeo-storyboard-the-problem-1.png` | ★ Keep | Beat 2 — AI erases web presence (Traffic 0 / Citations 0) |
| `aeo-storyboard-the-solution-1.png` | ★ Keep | Beat 3 — AEO restores visibility |
| `aeo-storyboard-the-solution-cta-1.png` | ★ Keep | Beat 4 — closing CTA |
| `aeo-storyboard-problem-and-solution-1.jpeg` | ★ Keep | Composite/cover summarizing the arc |
| `aeo-webpage-compare1.jpeg` | ★ Keep | Differentiator: unoptimized vs structured (score 0–10 scale — illustrative; app is 0–100) |
| `aeo-explainer-invisible-cta-1.jpeg` | ★ Keep | Problem + "Scan your site free" CTA |
| `aeo-explainer-brand-authority-1.jpeg` | ★ Keep | Transformation: data chaos → verified authority (clean, no false stat) |
| `landing-desktop/laptop/mobile/tablet.png` | ★ Keep | Real product shots (credible) |
| `social-*` (launch-<date>) | ★ Keep | Exact-dimension share cards per platform |
| `aeo-hero-image1/2.jpeg` | ◐ Decorative only | Sci-fi ambiance; invented citation tags — background, not factual |
| `aeo-explainer-easy-1.jpeg` | ◐ Edit before use | Crop ">90% margins / Firebase-Gemini" + "Traffic surge" chips |
| `aeo-explainer-journey-1.jpeg` | ✗ Prefer brand-authority-1 | Has "10x TRAFFIC" (unsubstantiated) — use the clean variant instead |
| `aeo-at-a-glance-1.jpeg` | ✗ Avoid as-is | "10x TRAFFIC", "90%+ margin", "$0.05/subscriber", "JOIN THE BETA" — outcome claim + internal economics + outdated |

**Accuracy rule (same as the launch kit):** no invented outcome stats (no "10x
traffic", no "+X% leads") and no internal economics (margins, per-user cost) in
customer-facing visuals until we have real, citable data. Directional framing
("Traffic 0 → Restored", "Invisible → Cited") is fine as illustration.

## Canonical SETS

**SET A — Storyboard (sequential / carousel):** struggle-1 → problem-1 → solution-1 → solution-cta-1 (cover: problem-and-solution-1). Best for a LinkedIn carousel or a 4-post drip.

**SET B — Explainer infographics (standalone posts / article inline):** invisible-cta-1 (problem) · brand-authority-1 (transformation) · webpage-compare1 (how/differentiator). Edit easy-1 if needed.

**SET C — Product / OG (site + link previews):** AEO-Analyzer-OG-Image (primary OG) · landing-* screenshots (product) · hero-image1/2 (decorative banners).

## Article series ↔ images (Problem · Solution · Benefits)

| Article / post | Hero | Embedded (in order) |
|---|---|---|
| **Re-launch announcement** (`blog-relaunch-2026.md`) | AEO-Analyzer-OG-Image (or generated HERO-A) | invisible-cta-1 (problem) → webpage-compare1 (differentiator) → brand-authority-1 (benefits) → `landing-desktop`/`section-hero` (product) → solution-cta-1 (CTA) |
| **"AI erased your web presence"** (problem piece) | the-problem-1 | the-struggle-1 → invisible-cta-1 → (real analytics-style screenshot if available) |
| **"AEO is the new answer"** (solution piece) | the-solution-1 | webpage-compare1 → brand-authority-1 → `section-why-analyzers` |
| **"Become the Source of Truth"** (benefits/authority) | brand-authority-1 | AEO-Analyzer-OG-Image → `section-who-its-for` → solution-cta-1 |
| **Dogfood case study** ("we were invisible to AI") | webpage-compare1 | `landing-desktop` (real) → `section-hero` → AEO-Analyzer-OG-Image |
| **Day Pass / single-site** | AEO-Analyzer-OG-Image | (EMB-4 "hours→seconds" if generated) |

## Recommended cleanups (when you have time)
1. **Standardize brand name** to "AEO Analyzers" (plural) on regenerated OG/hero/storyboards.
2. **Retire/replace** at-a-glance-1 and journey-1 (false/internal claims).
3. Optionally regenerate the OG with the current **0–100 score** and the live hero line ("Be the answer AI gives").
4. New conceptual fills (HERO-A, EMB-1/2, CTA-Z) only if you want — see `launch-announcement-kit.md`. Most beats are already covered by the assets above.
