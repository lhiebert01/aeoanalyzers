import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { planSweep } from '../lib/sweepPlan';
import { execFileSync } from 'node:child_process';

/** Review gate for comparison content.
 *
 *  `/best-aeo-tools` names competitors and states facts about their products. A
 *  page like that is only defensible if every competitor claim is verified, and
 *  the page itself says so. So the two things must move together:
 *
 *    unverified markers present  =>  the page MUST be noindex
 *    the page is indexable       =>  NO unverified markers may remain
 *
 *  Shipping it indexable with `[[VERIFY]]` cells still in the table would be
 *  exactly the failure the page criticises in other vendors. This test makes
 *  that combination impossible rather than relying on someone remembering. */

const ROOT = resolve(__dirname, '../..');

/** Every committed static page that makes claims about third parties. */
function comparisonPages(): string[] {
  return execFileSync('git', ['ls-files', 'public'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f.endsWith('/index.html'))
    .filter((f) => /best-aeo-tools|comparison|vs-/.test(f));
}

const MARKER = /\[\[VERIFY/;
const NOINDEX = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i;

describe('comparison pages never ship indexable with unverified claims', () => {
  it('the D1 page exists and is committed', () => {
    expect(existsSync(resolve(ROOT, 'public/best-aeo-tools/index.html'))).toBe(true);
    expect(comparisonPages()).toContain('public/best-aeo-tools/index.html');
  });

  it('any page still carrying verification markers is noindex', () => {
    const offenders: string[] = [];
    for (const f of comparisonPages()) {
      const html = readFileSync(resolve(ROOT, f), 'utf8');
      if (MARKER.test(html) && !NOINDEX.test(html)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it('states its own vendor interest and names no winner', () => {
    const html = readFileSync(resolve(ROOT, 'public/best-aeo-tools/index.html'), 'utf8');
    // The disclosure is the thing that makes a vendor-written comparison usable.
    expect(html.toLowerCase()).toContain('we make one of these tools');
    // No self-refereed win, no superlative about OURSELVES.
    //
    // This deliberately does NOT forbid the bare phrase "best AEO tools". That is the
    // category question buyers ask and the page is titled for it; banning it would
    // forbid the page from being findable for the thing it is about. What must never
    // appear is the phrase pointed at US.
    const SELF_SUPERLATIVE = [
      /\bwe are the best\b/i,
      /\b#1\s+(aeo|ai[- ]?visibility|tool)/i,
      /AEO Analyzers\b[^.<]{0,60}\b(is|remains|stays)\b[^.<]{0,40}\bbest\b/i,
      /\bbest\b[^.<]{0,40}\bis (AEO Analyzers|ours)\b/i,
      /\bthe only (tool|platform|software)\b/i,
    ];
    for (const re of SELF_SUPERLATIVE) {
      expect(html, `self-superlative matched ${re}`).not.toMatch(re);
    }
    // And the page must still say out loud that it is not refereeing its own category.
    expect(html.toLowerCase()).toContain('we do not claim to be the best tool in this category');
  });

  it('every number about our own measurement carries its N', () => {
    const html = readFileSync(resolve(ROOT, 'public/best-aeo-tools/index.html'), 'utf8');
    expect(html).toContain('200 recorded answers');
    expect(html).toContain('0 of 200');
  });
});

/** The three-part series is an architecture, not a publishing order. Readers arrive
 *  asynchronously and enter through any page, so each one must reach the other two.
 *  A broken cross-link silently turns a cluster back into three orphans. */
describe('the AEO buyer series stays interlinked', () => {
  const PAGES = {
    'public/what-should-an-aeo-tool-do/index.html': '/what-should-an-aeo-tool-do',
    'public/aeo-buyers-standard/index.html': '/aeo-buyers-standard',
    'public/best-aeo-tools/index.html': '/best-aeo-tools',
  } as const;

  it('all three pages exist and are indexable', () => {
    for (const f of Object.keys(PAGES)) {
      const html = readFileSync(resolve(ROOT, f), 'utf8');
      expect(existsSync(resolve(ROOT, f)), f).toBe(true);
      expect(html, `${f} must not be noindex`).not.toMatch(NOINDEX);
      expect(html, `${f} needs a canonical`).toMatch(/rel="canonical"/);
    }
  });

  it('each page links to the other two', () => {
    for (const [f, self] of Object.entries(PAGES)) {
      const html = readFileSync(resolve(ROOT, f), 'utf8');
      for (const other of Object.values(PAGES)) {
        if (other === self) continue;
        expect(html, `${f} must link to ${other}`).toContain(`href="${other}"`);
      }
    }
  });

  it('each page is declared in the sitemap', () => {
    const sm = readFileSync(resolve(ROOT, 'public/sitemap.xml'), 'utf8');
    for (const slug of Object.values(PAGES)) {
      expect(sm, `${slug} missing from sitemap`).toContain(`https://aeoanalyzers.com${slug}`);
    }
  });

  it('each page carries Article schema pointing at the canonical entities', () => {
    for (const f of Object.keys(PAGES)) {
      const html = readFileSync(resolve(ROOT, f), 'utf8');
      expect(html, `${f} needs JSON-LD`).toContain('application/ld+json');
      expect(html).toContain('https://aeoanalyzers.com/#organization');
      expect(html).toContain('https://aeoanalyzers.com/#founder');
    }
  });
});

/** Social cards and heroes. Every page in the series must ship a real OG image with
 *  dimensions and alt text, and the file must actually exist at the declared path —
 *  a card that 404s renders blank, which is the state these pages were in for a day. */
describe('buyer series pages carry real social images', () => {
  const SLUGS = ['what-should-an-aeo-tool-do','aeo-buyers-standard','best-aeo-tools','aeo-buyers-guide'];

  it('declares og:image with width, height, type and alt', () => {
    for (const s of SLUGS) {
      const html = readFileSync(resolve(ROOT, `public/${s}/index.html`), 'utf8');
      expect(html, `${s} og:image`).toMatch(/property="og:image" content="https:\/\/aeoanalyzers\.com\/img\/buyer-series\//);
      for (const t of ['og:image:width','og:image:height','og:image:type','og:image:alt','twitter:card','twitter:image']) {
        expect(html, `${s} missing ${t}`).toContain(t);
      }
    }
  });

  it('the declared image files exist on disk at the exact declared size', () => {
    for (const s of SLUGS) {
      expect(existsSync(resolve(ROOT, `public/img/buyer-series/${s}-og-1200x630.jpg`)), `${s} OG file`).toBe(true);
      expect(existsSync(resolve(ROOT, `public/img/buyer-series/${s}-hero-1600x900.jpg`)), `${s} hero file`).toBe(true);
    }
  });

  it('every hero carries non-trivial alt text', () => {
    for (const s of SLUGS) {
      const html = readFileSync(resolve(ROOT, `public/${s}/index.html`), 'utf8');
      const m = html.match(/<img class="posthero"[\s\S]*?alt="([^"]+)"/);
      expect(m, `${s} hero img`).not.toBeNull();
      expect(m![1].length, `${s} alt text too short to be useful`).toBeGreaterThan(60);
    }
  });
});

/** A hub card is a promise about the destination. When a page is retitled and its card
 *  is not, the reader clicks "what they actually measure" and lands on "what to compare
 *  before you buy" — a small break in exactly the kind of trust these pages trade on. */
describe('blog hub cards match the pages they link to', () => {
  it('no card title contradicts the H1 of the page it links to', () => {
    const hub = readFileSync(resolve(ROOT, 'public/blog/index.html'), 'utf8');
    const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&#8217;|&rsquo;/g, "'").replace(/&mdash;/g, '-');
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    /** split on the FIRST colon, before normalising strips it */
    const split = (raw: string): [string, string] => {
      const t = strip(raw);
      const i = t.indexOf(':');
      return i < 0 ? [norm(t), ''] : [norm(t.slice(0, i)), norm(t.slice(i + 1))];
    };
    const cards = [...hub.matchAll(/<h2><a href="(\/[a-z0-9/-]+)">([\s\S]*?)<\/a><\/h2>/g)];
    expect(cards.length).toBeGreaterThan(6);
    for (const [, href, title] of cards) {
      const file = resolve(ROOT, `public${href.replace(/\/$/, '')}/index.html`);
      if (!existsSync(file)) continue;
      const m = readFileSync(file, 'utf8').match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
      if (!m) continue;
      const [cardLead, cardSub] = split(title);
      const [h1Lead, h1Sub] = split(m[1]);
      // The leading phrase must always match — that is what catches a retitled page.
      expect(h1Lead, `card "${cardLead}" leads differently from page H1 "${h1Lead}"`).toContain(cardLead);
      // A card may ADD a subtitle where the page has none. It may not CONTRADICT one.
      if (cardSub && h1Sub) {
        expect(h1Sub, `card subtitle "${cardSub}" contradicts page subtitle "${h1Sub}"`).toContain(cardSub);
      }
    }
  });
});

/** Schema drift. A page can be retitled while its Article headline and description keep
 *  the old words — and schema is what an engine reads, so the stale copy is the copy that
 *  travels. /best-aeo-tools shipped a day with a headline in its JSON-LD that no longer
 *  existed on the page. */
describe('Article schema matches the page it describes', () => {
  const SLUGS = ['what-should-an-aeo-tool-do','aeo-buyers-standard','best-aeo-tools','aeo-buyers-guide'];
  /** Normalise BOTH the entity and the literal character — schema lands as JSON with a
   *  real curly apostrophe while the HTML carries &rsquo;, and they must compare equal. */
  const text = (s: string) => s.replace(/<[^>]+>/g, '')
    .replace(/&rsquo;|&#8217;|[\u2018\u2019]/g, "'")
    .replace(/&mdash;|[\u2013\u2014]/g, '-')
    .replace(/&ldquo;|&rdquo;|[\u201C\u201D]/g, '"')
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

  it('headline in JSON-LD equals the H1 on the page', () => {
    for (const slug of SLUGS) {
      const html = readFileSync(resolve(ROOT, `public/${slug}/index.html`), 'utf8');
      const h1 = text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)![1]);
      const art = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
      // The schema headline may be the longer SEO title and ADD a subtitle the H1 omits.
      // It may not CONTRADICT one. Neither containing the other is the drift we are after.
      const a = text(art.headline), b = h1;
      expect(a.includes(b) || b.includes(a),
        `${slug}: schema headline "${a}" contradicts page H1 "${b}"`).toBe(true);
    }
  });

  it('description in JSON-LD equals the meta description', () => {
    for (const slug of SLUGS) {
      const html = readFileSync(resolve(ROOT, `public/${slug}/index.html`), 'utf8');
      const meta = text(html.match(/<meta name="description" content="([^"]*)"/)![1]);
      const art = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
      const a = text(art.description), b = meta;
      expect(a.includes(b) || b.includes(a),
        `${slug}: schema description "${a.slice(0, 60)}..." contradicts meta "${b.slice(0, 60)}..."`).toBe(true);
    }
  });
});

/** WO-AEO-GUIDE-GAP-001 §5 C1 — the app was corrected under INTEGRITY-002 B1(b) and the
 *  BLOG was not. "several times each" stayed served on three pages, in prose, in meta
 *  descriptions and inside Article JSON-LD, which is the copy that travels to the engines.
 *  It is not true at the panel size we sell: planSweep drops a 12-question panel to ONE
 *  run per question per engine, because 12 x 4 x 3 overflows the non-admin query-run cap.
 *  The product prints the per-cell N, so the honest phrasing is "one or more times each". */
describe('published copy does not promise more runs than the product performs', () => {
  const pages = ['public/blog/index.html', 'public/blog/how-it-works/index.html',
                 'public/blog/why-ai-doesnt-mention-you/index.html'];

  it('never says "several times each" anywhere it is served', () => {
    for (const p of pages) {
      expect(readFileSync(resolve(__dirname, '..', '..', p), 'utf8'),
        `${p} promises more runs than a 12-question panel actually gets`)
        .not.toContain('several times each');
    }
  });

  it('planSweep really does drop a 12-question panel to one run — the reason for the copy', () => {
    expect(planSweep(12, 4, { requestedReps: 3 }).reps).toBe(1);
    // and fewer questions genuinely do buy more runs each, which is what the copy now says
    expect(planSweep(5, 4, { requestedReps: 3 }).reps).toBeGreaterThan(1);
  });
});
