import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

/** WO-AEO-BLOG-HOWTO-IMAGES-NAV-016: every blog, how-to, guide and ledger page reads like
 *  /blog/how-it-works — full navigation, a breadcrumb, a way back, and images that explain. */
const PLAN = JSON.parse(readFileSync('docs/images/blog-pages-2026-11.json', 'utf8'));
const pages: { path: string; section: string }[] = PLAN.pages;
const html = (p: string) => readFileSync(`public${p}/index.html`, 'utf8');
const PRICE = /(\$|€|£)\s?\d|\bper month\b|\/mo\b|\bUSD\b/i;

describe('WO-016: every page in the plan', () => {
  for (const p of pages) {
    it(`${p.path}: hero, share card, breadcrumb, back link, embedded image`, () => {
      const h = html(p.path);
      // Hero under the title: text-free art with real alt text.
      const hero = h.match(/<figure class="posthero"><img src="([^"]+)" alt="([^"]{30,})"/);
      expect(hero, 'hero').not.toBeNull();
      expect(existsSync(`public${hero![1]}`), `hero file ${hero![1]}`).toBe(true);
      // Share card: a per-page file (new filename), with size, type and alt.
      const og = h.match(/<meta property="og:image" content="https:\/\/aeoanalyzers\.com(\/img\/blog\/2026-11\/og-[a-z0-9-]+-2026-11b?\.jpg)">/);
      expect(og, 'og:image').not.toBeNull();
      expect(existsSync(`public${og![1]}`), `og file ${og![1]}`).toBe(true);
      for (const t of ['og:image:width" content="1200', 'og:image:height" content="630', 'og:image:alt', 'twitter:image"', 'twitter:image:alt']) expect(h, t).toContain(t);
      // Full site header and the breadcrumb, with BreadcrumbList structured data.
      expect(h).toContain('<!--wo016:header-->');
      expect(h).toMatch(/<a href="\/aeo-checker">Free AEO Checker<\/a>/);
      expect(h).toMatch(/<nav class="crumbs" aria-label="Breadcrumb"><a href="\/">Home<\/a>.*<a href="\/blog\/">Blog<\/a>/);
      expect(h).toContain('"@type":"BreadcrumbList"');
      // Back to the blog, above the title and again at the end.
      expect((h.match(/class="backlink" href="\/blog\/">← Back to the blog/g) || []).length).toBeGreaterThanOrEqual(2);
      if (p.path === '/blog/how-to') return;
      // At least one explanatory image in the body (not the hero), with alt text.
      const body = h.slice(h.indexOf('</h1>'));
      const imgs = [...body.matchAll(/<img (?![^>]*class="thumb")[^>]*src="(?:https:\/\/aeoanalyzers\.com)?([^"]+)"[^>]*alt="([^"]*)"/g)].filter((m) => !m[1].endsWith('-hero.webp'));
      expect(imgs.length, 'embedded image').toBeGreaterThan(0);
      for (const m of imgs) {
        expect(m[2].length, `alt for ${m[1]}`).toBeGreaterThan(20);
        expect(existsSync(`public${m[1]}`), `file ${m[1]}`).toBe(true);
      }
    });
  }

  it('no image alt text or caption on these pages carries a price', () => {
    for (const p of pages) {
      const h = html(p.path);
      for (const m of h.matchAll(/\balt="([^"]*)"/g)) expect(m[1], `${p.path} alt`).not.toMatch(PRICE);
      for (const m of h.matchAll(/<figcaption>([\s\S]*?)<\/figcaption>/g)) expect(m[1], `${p.path} caption`).not.toMatch(PRICE);
    }
    const figs = JSON.parse(readFileSync('docs/images/blog-figures-2026-11.json', 'utf8'));
    for (const [id, f] of Object.entries<any>(figs)) { expect(f.alt, id).not.toMatch(PRICE); expect(f.caption, id).not.toMatch(PRICE); }
  });

  it('the blog index is sectioned in the ruled order, and /blog/how-to lists the How to section', () => {
    const idx = readFileSync('public/blog/index.html', 'utf8');
    const order = [...idx.matchAll(/<h2 class="sech">([^<]+)<\/h2>/g)].map((m) => m[1]);
    expect(order).toEqual(['Start here', 'How to', 'The Honest-Zero ledger', 'Buyer series', 'Behind the scenes']);
    const how = readFileSync('public/blog/how-to/index.html', 'utf8');
    for (const p of pages.filter((x) => x.section === 'How to' && x.path !== '/blog/how-to')) expect(how).toContain(`href="${p.path}"`);
  });

  it('the rebuilt three-layers visual names no other product and is labeled illustrative', () => {
    const f = JSON.parse(readFileSync('docs/images/blog-figures-2026-11.json', 'utf8'))['three-layers'];
    expect(`${f.alt} ${f.caption}`).toMatch(/Illustrative example/);
    expect(`${f.alt} ${f.caption}`).not.toMatch(/Otterly|BrandDetect|Mentionlytics/);
    expect(readFileSync('public/blog/how-it-works/index.html', 'utf8')).not.toContain('visual-2-three-layers.png');
  });
});
