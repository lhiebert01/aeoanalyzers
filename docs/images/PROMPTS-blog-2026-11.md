# WO-016 blog hero art prompts (Nov 2026)

Model: `gemini-3-pro-image` (REST generateContent, responseModalities IMAGE, imageConfig aspectRatio 16:9). Raw output in `private/blog-art-2026-11/` (gitignored). Heroes rendered 1600x900 WebP; OG cards 1200x630 JPEG with logo mark, AEO ANALYZERS and page title set in code (`private/wo012-check/blog_art_compose.ts`).

## /aeo-buyers-guide

- slug: `aeo-buyers-guide`
- title (OG card): The AEO Buyer’s Guide: three short reads

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: an open checklist of seven separate panels, the first one softly lit. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/aeo-buyers-guide-raw-r1.jpg, private/blog-art-2026-11/aeo-buyers-guide-raw-v2.jpg, private/blog-art-2026-11/aeo-buyers-guide-raw-v3.jpg, private/blog-art-2026-11/aeo-buyers-guide-raw-v4.jpg, private/blog-art-2026-11/aeo-buyers-guide-raw.jpg
- take used: `private/blog-art-2026-11/aeo-buyers-guide-raw-v4.jpg`
- hero: `public/img/blog/2026-11/aeo-buyers-guide-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-aeo-buyers-guide-2026-11b.jpg` (1200x630)
- note: Redo v2 (faint bars/blocks on the left read as text or code): 3 call(s). v2 rejected: eight panels, and the repeated check-and-purple-tab mark read as a logo. v3 rejected: a large light grey inset frame filled the right side. v4 used: seven plain stacked panels, top one lit, left side empty. New OG card written to a new filename (-2026-11b) because the old card is live and LinkedIn caches by URL; the old -2026-11.jpg file is left in place.

Redo v2 prompt (composition sentence replaced; TEXT line extended):

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: an open checklist of seven separate panels, the first one softly lit. COMPOSITION: subject in the right 60%; left 40% an empty, plain dark navy area with no objects, lines, bars, panels or blocks of any kind; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. No placeholder bars, lines or blocks that imitate text or code. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

## /what-should-an-aeo-tool-do

- slug: `what-should-an-aeo-tool-do`
- title (OG card): What Should an AEO Tool Actually Do?

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: three separated panels of light standing side by side. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/what-should-an-aeo-tool-do-raw.jpg
- take used: `private/blog-art-2026-11/what-should-an-aeo-tool-do-raw.jpg`
- hero: `public/img/blog/2026-11/what-should-an-aeo-tool-do-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-what-should-an-aeo-tool-do-2026-11.jpg` (1200x630)

## /blog/why-ai-doesnt-mention-you

- slug: `why-ai-doesnt-mention-you`
- title (OG card): Why AI Still Doesn’t Mention Your Business

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a soft beam sweeping across a wide field of cards, lighting only the first ten. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/why-ai-doesnt-mention-you-raw-r1.jpg, private/blog-art-2026-11/why-ai-doesnt-mention-you-raw-r2.jpg, private/blog-art-2026-11/why-ai-doesnt-mention-you-raw.jpg
- take used: `private/blog-art-2026-11/why-ai-doesnt-mention-you-raw-r2.jpg`
- hero: `public/img/blog/2026-11/why-ai-doesnt-mention-you-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-why-ai-doesnt-mention-you-2026-11.jpg` (1200x630)
- note: Takes 0 and 1 had an inset border and code-like texture; take r2 used.

## /monitor-brand-in-chatgpt-and-claude

- slug: `monitor-brand-in-chatgpt-and-claude`
- title (OG card): How to monitor whether your brand appears in ChatGPT and Claude responses

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a ring of identical question cards orbiting one central card. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/monitor-brand-in-chatgpt-and-claude-raw-r1.jpg, private/blog-art-2026-11/monitor-brand-in-chatgpt-and-claude-raw-r2.jpg, private/blog-art-2026-11/monitor-brand-in-chatgpt-and-claude-raw.jpg
- take used: `private/blog-art-2026-11/monitor-brand-in-chatgpt-and-claude-raw-v1.jpg`
- hero: `public/img/blog/2026-11/monitor-brand-in-chatgpt-and-claude-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-monitor-brand-in-chatgpt-and-claude-2026-11.jpg` (1200x630)
- note: Redo (coordinator, WO-016): 1 call; take v1 used (14 blank cards orbiting one central card, no marks).

Redo prompt (subject replaced; TEXT line extended):

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a ring of identical blank, unmarked cards orbiting one central card; the cards carry no symbols, glyphs or marks of any kind. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No placeholder bars, lines or blocks that imitate text or code. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

## /track-brand-mentions-across-ai-answer-engines

- slug: `track-brand-mentions-across-ai-answer-engines`
- title (OG card): How to track and analyze brand mentions across AI answer engines

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: four parallel lanes of cards, one lane mostly dim. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/track-brand-mentions-across-ai-answer-engines-raw.jpg
- take used: `private/blog-art-2026-11/track-brand-mentions-across-ai-answer-engines-raw.jpg`
- hero: `public/img/blog/2026-11/track-brand-mentions-across-ai-answer-engines-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-track-brand-mentions-across-ai-answer-engines-2026-11.jpg` (1200x630)

## /score-pages-for-answer-engine-readiness

- slug: `score-pages-for-answer-engine-readiness`
- title (OG card): Is there an analyzer that scores your pages for answer engine readiness?

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a page outline being scanned by three soft beams of light. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/score-pages-for-answer-engine-readiness-raw-r1.jpg, private/blog-art-2026-11/score-pages-for-answer-engine-readiness-raw-v2.jpg, private/blog-art-2026-11/score-pages-for-answer-engine-readiness-raw.jpg
- take used: `private/blog-art-2026-11/score-pages-for-answer-engine-readiness-raw-v2.jpg`
- hero: `public/img/blog/2026-11/score-pages-for-answer-engine-readiness-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-score-pages-for-answer-engine-readiness-2026-11b.jpg` (1200x630)
- note: Redo v2 (faint bars/blocks on the left read as text or code): 1 call(s). v2 used: tilted page outline crossed by three beams, left side empty. The beams fade out just inside the left 40% (under the OG overlay; no hard edges). New OG card written to a new filename (-2026-11b) because the old card is live and LinkedIn caches by URL; the old -2026-11.jpg file is left in place.

Redo v2 prompt (composition sentence replaced; TEXT line extended):

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a page outline being scanned by three soft beams of light. COMPOSITION: subject in the right 60%; left 40% an empty, plain dark navy area with no objects, lines, bars, panels or blocks of any kind; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. No placeholder bars, lines or blocks that imitate text or code. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

## /diagnose-dropped-out-of-perplexity-citations

- slug: `diagnose-dropped-out-of-perplexity-citations`
- title (OG card): How to diagnose why you dropped out of Perplexity citations

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: one card that has slipped out of a neatly lit row of cards. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/diagnose-dropped-out-of-perplexity-citations-raw.jpg
- take used: `private/blog-art-2026-11/diagnose-dropped-out-of-perplexity-citations-raw.jpg`
- hero: `public/img/blog/2026-11/diagnose-dropped-out-of-perplexity-citations-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-diagnose-dropped-out-of-perplexity-citations-2026-11.jpg` (1200x630)

## /ai-answers-get-facts-wrong-about-my-brand

- slug: `ai-answers-get-facts-wrong-about-my-brand`
- title (OG card): Which tools show where AI answers get facts wrong about your brand?

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a row of aligned cards where one card has a subtly mismatched edge. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/ai-answers-get-facts-wrong-about-my-brand-raw-r1.jpg, private/blog-art-2026-11/ai-answers-get-facts-wrong-about-my-brand-raw.jpg
- take used: `private/blog-art-2026-11/ai-answers-get-facts-wrong-about-my-brand-raw-r1.jpg`
- hero: `public/img/blog/2026-11/ai-answers-get-facts-wrong-about-my-brand-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-ai-answers-get-facts-wrong-about-my-brand-2026-11.jpg` (1200x630)
- note: Original had a logo-like mark on the odd card; take r1 used.

## /competitive-prompt-benchmarking

- slug: `competitive-prompt-benchmarking`
- title (OG card): Competitive prompt benchmarking for AI answer engines: what it is and what to look for

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: several rows of identical cards side by side, with a few cards in one row glowing. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/competitive-prompt-benchmarking-raw-r1.jpg, private/blog-art-2026-11/competitive-prompt-benchmarking-raw-v2.jpg, private/blog-art-2026-11/competitive-prompt-benchmarking-raw.jpg
- take used: `private/blog-art-2026-11/competitive-prompt-benchmarking-raw-v2.jpg`
- hero: `public/img/blog/2026-11/competitive-prompt-benchmarking-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-competitive-prompt-benchmarking-2026-11b.jpg` (1200x630)
- note: Redo v2 (faint bars/blocks on the left read as text or code): 1 call(s). v2 used: rows of blank card frames, three glowing in one row, left side empty. New OG card written to a new filename (-2026-11b) because the old card is live and LinkedIn caches by URL; the old -2026-11.jpg file is left in place.

Redo v2 prompt (composition sentence replaced; TEXT line extended):

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: several rows of identical cards side by side, with a few cards in one row glowing. COMPOSITION: subject in the right 60%; left 40% an empty, plain dark navy area with no objects, lines, bars, panels or blocks of any kind; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. No placeholder bars, lines or blocks that imitate text or code. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

## /guides/directory-listings

- slug: `guide-directory-listings`
- title (OG card): How to list your business on directories, step by step

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a tidy grid of directory cards, a few of them lit. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/guide-directory-listings-raw-v2.jpg, private/blog-art-2026-11/guide-directory-listings-raw-v3.jpg, private/blog-art-2026-11/guide-directory-listings-raw.jpg
- take used: `private/blog-art-2026-11/guide-directory-listings-raw-v3.jpg`
- hero: `public/img/blog/2026-11/guide-directory-listings-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-guide-directory-listings-2026-11b.jpg` (1200x630)
- note: Redo v2 (faint bars/blocks on the left read as text or code): 2 call(s). v2 rejected: cards filled with text-like placeholder lines and a logo-like ring. v3 used: grid of abstract colour tiles, three lit; left side empty. New OG card written to a new filename (-2026-11b) because the old card is live and LinkedIn caches by URL; the old -2026-11.jpg file is left in place.

Redo v2 prompt (composition sentence replaced; TEXT line extended):

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a tidy grid of directory cards, a few of them lit. COMPOSITION: subject in the right 60%; left 40% an empty, plain dark navy area with no objects, lines, bars, panels or blocks of any kind; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. No placeholder bars, lines or blocks that imitate text or code. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

## /guides/wikidata

- slug: `guide-wikidata`
- title (OG card): How to create your company's Wikidata entry, step by step

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: one central card linked by fine lines to several surrounding nodes. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/guide-wikidata-raw.jpg
- take used: `private/blog-art-2026-11/guide-wikidata-raw.jpg`
- hero: `public/img/blog/2026-11/guide-wikidata-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-guide-wikidata-2026-11.jpg` (1200x630)

## /evidence

- slug: `evidence`
- title (OG card): Our own numbers, every month

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a long calendar row of cards receding into the distance. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/evidence-raw.jpg
- take used: `private/blog-art-2026-11/evidence-raw.jpg`
- hero: `public/img/blog/2026-11/evidence-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-evidence-2026-11.jpg` (1200x630)

## /blog/found-not-recommended

- slug: `found-not-recommended`
- title (OG card): Optimizing your website gets you found. It does not get you recommended.

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: two paths leaving one doorway: one lit and reaching a set of cards, the other ending at a closed set of cards. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/found-not-recommended-raw-r1.jpg, private/blog-art-2026-11/found-not-recommended-raw-v2.jpg, private/blog-art-2026-11/found-not-recommended-raw-v3.jpg, private/blog-art-2026-11/found-not-recommended-raw-v4.jpg, private/blog-art-2026-11/found-not-recommended-raw.jpg
- take used: `private/blog-art-2026-11/found-not-recommended-raw-v3.jpg`
- hero: `public/img/blog/2026-11/found-not-recommended-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-found-not-recommended-2026-11b.jpg` (1200x630)
- note: Redo v2 (faint bars/blocks on the left read as text or code): 3 call(s). v2 rejected: dashboard-style cards with chart and line placeholders. v4 rejected: the left 39% was a separate, darker flat panel with a hard vertical seam. v3 used: archway, lit path to an open folded purple card, second route to a closed card stack; left side uniform navy. The open card carries a few abstract teal shapes (not text-like). New OG card written to a new filename (-2026-11b) because the old card is live and LinkedIn caches by URL; the old -2026-11.jpg file is left in place.

Redo v2 prompt (composition sentence replaced; TEXT line extended):

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: two paths leaving one doorway: one lit and reaching a set of cards, the other ending at a closed set of cards. COMPOSITION: subject in the right 60%; left 40% an empty, plain dark navy area with no objects, lines, bars, panels or blocks of any kind; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. No placeholder bars, lines or blocks that imitate text or code. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

## /blog/i-scored-zero

- slug: `i-scored-zero`
- title (OG card): I Ran My Own AI-Visibility Tool on My Own Site. It Scored 0%.

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a lit library of cards with one small card highlighted. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/i-scored-zero-raw.jpg
- take used: `private/blog-art-2026-11/i-scored-zero-raw.jpg`
- hero: `public/img/blog/2026-11/i-scored-zero-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-i-scored-zero-2026-11.jpg` (1200x630)

## /blog/reading-isnt-citing

- slug: `reading-isnt-citing`
- title (OG card): The Engines Read My Site. Reading Isn't Citing.

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a lit library of cards with one small card highlighted, seen from a different angle. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/reading-isnt-citing-raw.jpg
- take used: `private/blog-art-2026-11/reading-isnt-citing-raw.jpg`
- hero: `public/img/blog/2026-11/reading-isnt-citing-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-reading-isnt-citing-2026-11.jpg` (1200x630)

## /blog/the-fifth-engine

- slug: `the-fifth-engine`
- title (OG card): We added a fifth AI engine. Here is what changed, and what did not.

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: five rounded frames in a row, the fifth edged in green. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/the-fifth-engine-raw-r1.jpg, private/blog-art-2026-11/the-fifth-engine-raw-r2.jpg, private/blog-art-2026-11/the-fifth-engine-raw.jpg
- take used: `private/blog-art-2026-11/the-fifth-engine-raw-v2.jpg`
- hero: `public/img/blog/2026-11/the-fifth-engine-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-the-fifth-engine-2026-11.jpg` (1200x630)
- note: Redo (coordinator, WO-016): 2 calls; v1 rejected (five hollow outlines in a row read as "00000"); take v2 used (exactly five filled frames, fifth edged in teal-green; counted).

Redo prompt (subject replaced; TEXT line extended):

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: exactly five identical rounded rectangular frames in a single horizontal row, evenly spaced, the fifth (rightmost) edged in teal-green; no other objects. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No placeholder bars, lines or blocks that imitate text or code. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

## /blog/the-measurement-layer

- slug: `the-measurement-layer`
- title (OG card): We Built an AI Visibility Tool. Then We Tested Ourselves. The Result Was Zero.

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: three separated panels of light, seen at an angle. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/the-measurement-layer-raw.jpg
- take used: `private/blog-art-2026-11/the-measurement-layer-raw.jpg`
- hero: `public/img/blog/2026-11/the-measurement-layer-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-the-measurement-layer-2026-11.jpg` (1200x630)

## /blog/one-question-is-not-a-measurement

- slug: `one-question-is-not-a-measurement`
- title (OG card): One Question Is Not a Measurement

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a grid of small cards, some lit and some dim. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/one-question-is-not-a-measurement-raw.jpg
- take used: `private/blog-art-2026-11/one-question-is-not-a-measurement-raw.jpg`
- hero: `public/img/blog/2026-11/one-question-is-not-a-measurement-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-one-question-is-not-a-measurement-2026-11.jpg` (1200x630)

## /aeo-buyers-standard

- slug: `aeo-buyers-standard`
- title (OG card): The AEO Buyer’s Standard

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: an open checklist of seven panels arranged in two rows. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/aeo-buyers-standard-raw.jpg
- take used: `private/blog-art-2026-11/aeo-buyers-standard-raw.jpg`
- hero: `public/img/blog/2026-11/aeo-buyers-standard-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-aeo-buyers-standard-2026-11.jpg` (1200x630)

## /best-aeo-tools

- slug: `best-aeo-tools`
- title (OG card): Best AEO Tools in 2026: What to Compare Before You Buy

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: an open checklist of seven panels with a ruler-like guide beside it. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/best-aeo-tools-raw.jpg
- take used: `private/blog-art-2026-11/best-aeo-tools-raw.jpg`
- hero: `public/img/blog/2026-11/best-aeo-tools-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-best-aeo-tools-2026-11.jpg` (1200x630)

## /blog/how-it-works

- slug: `how-it-works`
- title (OG card): How AEO Analyzers Works: The 90-Second Tour of a Hundred-Hour Analysis

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a horizontal stream of glowing cards flowing through five gates. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/how-it-works-raw.jpg
- take used: `private/blog-art-2026-11/how-it-works-raw.jpg`
- hero: `public/img/blog/2026-11/how-it-works-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-how-it-works-2026-11.jpg` (1200x630)

## /blog/what-you-actually-get

- slug: `what-you-actually-get`
- title (OG card): What You Actually Get: The Action Plan Inside Every Citation Sweep

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: five stacked layers of cards. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/what-you-actually-get-raw-r1.jpg, private/blog-art-2026-11/what-you-actually-get-raw.jpg
- take used: `private/blog-art-2026-11/what-you-actually-get-raw-r1.jpg`
- hero: `public/img/blog/2026-11/what-you-actually-get-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-what-you-actually-get-2026-11.jpg` (1200x630)
- note: Original had small arrow icons on one layer; take r1 used.

## /blog/are-you-the-answer-ai-gives

- slug: `are-you-the-answer-ai-gives`
- title (OG card): Is your brand the answer AI gives — or is a competitor?

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: two round gauges facing each other, with no markings. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/are-you-the-answer-ai-gives-raw-r1.jpg, private/blog-art-2026-11/are-you-the-answer-ai-gives-raw-r2.jpg, private/blog-art-2026-11/are-you-the-answer-ai-gives-raw.jpg
- take used: `private/blog-art-2026-11/are-you-the-answer-ai-gives-raw-r2.jpg`
- hero: `public/img/blog/2026-11/are-you-the-answer-ai-gives-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-are-you-the-answer-ai-gives-2026-11.jpg` (1200x630)
- note: Original and r1 read as the digits "00"; take r2 (two gauges with needles) used.

## /get-recommended

- slug: `get-recommended`
- title (OG card): How AI engines choose who to recommend, and what you can do about it

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: three flat stepping stones crossing calm water, each one a little brighter. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/get-recommended-raw-r1.jpg, private/blog-art-2026-11/get-recommended-raw.jpg
- take used: `private/blog-art-2026-11/get-recommended-raw-r1.jpg`
- hero: `public/img/blog/2026-11/get-recommended-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-get-recommended-2026-11.jpg` (1200x630)
- note: Original had code-like texture on the left; take r1 used.

## /blog/how-to

- slug: `how-to`
- title (OG card): How to guides

Prompt:

```
CREATE ONE FINAL IMAGE. Canvas 1600 × 900 px, landscape, filled edge to edge, fully opaque. STYLE: calm, precise product-marketing art, clean geometric planes, soft single light source from the upper left, gentle shadows. PALETTE ONLY: background near-black navy #0A0F1C; primary teal-green #2FD39A; secondary purple #8B7CF6; neutral light grey #C9D1DC. No other hues. SUBJECT: a tidy shelf of instruction cards, neatly spaced. COMPOSITION: subject in the right 60%; left 40% quiet, low-contrast background for text set in code; nothing important within 60 px of any edge. TEXT: none. No letters, numbers, symbols that read as text, logos, engine or company marks, people, faces, robots, brains, phones, magnifying glasses, upward arrows, rankings, trophies or podiums. FINAL CHECK: reads at thumbnail size; no text anywhere.
```

- raw takes: private/blog-art-2026-11/how-to-raw.jpg
- take used: `private/blog-art-2026-11/how-to-raw.jpg`
- hero: `public/img/blog/2026-11/how-to-hero.webp` (1600x900)
- OG: `public/img/blog/2026-11/og-how-to-2026-11.jpg` (1200x630)
