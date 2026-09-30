# WO-AEO-BLOG-ONE-QUESTION-001 — close-out (2026-09-30)

**Published to production on the founder's plain "go" (2026-09-30).** Copy unchanged from the order.

| Item | Value |
|---|---|
| Commit (main) | `4abb6c2` (branch `content/one-question-2026-09-30`, rebased onto main, fast-forwarded) |
| Production deployment | `dpl_BFnYxtg46BZZqym7NX6oGwd9juQj` |
| URL | https://aeoanalyzers.com/blog/one-question-is-not-a-measurement |
| External fetch proof | `<title>One Question Is Not a Measurement \| AEO Analyzers</title>` with `robots=index,follow,max-image-preview:large`; sitemap carries the URL (1 match); `/blog/` links it (3 matches); the primer's "Next read" cross-link is live (1); `/llms.txt` lists it (1); OG image HTTP 200 |
| Gates | 565 tests green (7 in `oneQuestionPost.test.ts` ran in GO mode); tsc clean; orphan check + fail-closed prerender check passed |
| IndexNow | HTTP 200 for `/blog/`, the post, and `/what-should-an-aeo-tool-do` |
| Preview fix | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (public client values) now scoped production+preview on Vercel, so branch previews mount and pass the prerender check |

## Open
- **Hero + OG images are PIL placeholders** in the buyer-series palette. Two prompts delivered to
  `Downloads/IMAGE-PROMPTS-one-question-2026-09-30.txt` (also `docs/brand/BLOG-HERO-PROMPTS.md`).
  Founder renders → agent reviews against the prompt rules → installs at the same filenames
  (`img/one-question-hero-1600x900.png`, `img/one-question-og-1200x630.png`; a new OG filename
  busts the LinkedIn cache).
- Google Search Console: founder requests indexing of the post URL (IndexNow covers Bing only).
- G7 propagation checklist: `G7-PROPAGATION-CHECKLIST.md` in this folder (POSSE packs, Medium/Substack).
