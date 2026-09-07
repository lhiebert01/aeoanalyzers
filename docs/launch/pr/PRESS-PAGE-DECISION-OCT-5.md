# `/press` — build or remove. Both paths prepared, founder decides Oct 5 2026.

**Current state (verified live Sep 7 2026):** `/press` is **not a page**. It serves a
byte-identical copy of the prerendered homepage (58,567 bytes, title "Be the Answer AI Gives",
canonical `https://aeoanalyzers.com`). It was listed in `public/sitemap.xml`; that listing is
already removed, because the sitemap cleanup ships regardless of this decision.

There **is** a `src/components/PressKit.tsx` on `gtm-drafts-aug13`, so a component exists — but
nothing emits a document at `/press`, and the prerender step renders only `/`.

---

## Path A — BUILD it (Lantern Post pattern: dark behind a flag, flipped at wire time)

**Shape.** A committed static page at `public/press/index.html`, exactly like the six blog pages
that already work. Static files in `public/` are copied to `dist/` and served **before** the SPA
rewrite in `vercel.json` — that is why `/blog/how-it-works` serves 18,940 real bytes today. No
prerender change needed, no framework change, no risk to the app.

**"Dark behind a flag" here means content, not a feature flag.** The page ships live and
indexable before the wire, carrying everything except the wire link. It holds a
`<!-- WIRE_URL -->` placeholder; at wire time that becomes the live release URL. Nothing waits
for a wake word — the page publishes when it passes its gate.

**What goes on it** (this is where the material the wire cannot carry belongs):
- The release text, canonical on our own domain, with the wire copies pointing here.
- The **sourced comparison table** — the same competitor claim as the wire body, but with the
  measurement, the N, and the dated baseline behind each row.
- Links to `docs/baselines/`, the pinned twelve-question panel, and the methodology.
- `NewsArticle` JSON-LD with `datePublished`, `author`, `publisher` — pointing at the existing
  Organization node. **Do not create a second Organization node.**
- The "On the wire October 14, 2026" line with the `WIRE_URL` slot.

**Cost.** Half a day, mostly writing. Zero engineering risk. Add `/press` to `sitemap.xml` and to
`PRERENDERED`/static detection in `src/__tests__/sitemapHonesty.test.ts` in the same commit — the
test will fail until the file exists, which is the point.

**Deadline.** Live by **T-5 = Thu Oct 8**, the same day as submission.

---

## Path B — REMOVE it

Already done, and it is the safe default: `/press` is out of `public/sitemap.xml` as of Sep 7
2026. Nothing further is required.

**Consequence for the release.** The wire has nowhere of ours to point for the sourced
comparison, so that material moves to the strongest page that already exists. Recommended
substitute: `/blog/i-scored-zero`, which is real, prerendered at 22,036 bytes, and carries the
honest-zero story the release leads with.

**Cost.** Zero. **Deadline.** None.

---

## Recommendation

**Path A.** The playbook requires `/press` live before the wire, the page is the only place the
sourced comparison can live in full, and it is the cheapest real page we can add — the static
pattern is already proven six times over on this domain. Path B is a clean fallback if the
October 5 rulings run late.

Either way the sitemap is already honest, so there is no bad outcome from deciding late.
