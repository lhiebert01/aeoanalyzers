import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

/** Founder ruling (Nov 2, 2026): on every blog, how-to, guide and ledger page the first image under the
 *  title is the page's own share card, the same design and wording as og:image, rendered from the same
 *  source (scripts/build-share-cards.ts). This fails if the first image and og:image come from
 *  different card sources, or carry different headline text. */
const SITE = 'https://aeoanalyzers.com';
const PLAN = JSON.parse(readFileSync('docs/images/blog-pages-2026-11.json', 'utf8'));
const ART = JSON.parse(readFileSync('docs/images/blog-art-2026-11.json', 'utf8'));
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const meta = (h: string, attr: 'property' | 'name', key: string) => h.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];
const unesc = (s = '') => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const pageFile = (path: string) => `public${path}/index.html`;

export function checkPage(path: string, html: string, art: typeof ART[string]): string[] {
  const bad: string[] = [];
  const card = art?.card;
  if (!card) return [`${path}: no card record in docs/images/blog-art-2026-11.json`];
  const afterTitle = html.slice(html.search(/<h1[^>]*class="posttitle"/));
  const first = afterTitle.match(/<img src="([^"]+)" alt="([^"]*)"[^>]*>/);
  if (!first) return [`${path}: no image under the title`];
  const [, src, altRaw] = first;
  const alt = unesc(altRaw);
  const og = meta(html, 'property', 'og:image');
  const ogAlt = unesc(meta(html, 'property', 'og:image:alt'));
  if (src !== art.hero) bad.push(`${path}: first image ${src} is not the card's hero render ${art.hero}`);
  if (og !== SITE + art.og) bad.push(`${path}: og:image ${og} is not the card's share render ${art.og}`);
  if (meta(html, 'name', 'twitter:image') !== og) bad.push(`${path}: twitter:image differs from og:image`);
  // Same source: both files on disk are the ones rendered from this one card.
  if (!existsSync(`public${src}`) || sha(`public${src}`) !== card.heroSha) bad.push(`${path}: first image file was not rendered from card ${card.key}`);
  if (!og || !existsSync(`public${og.replace(SITE, '')}`) || sha(`public${og.replace(SITE, '')}`) !== card.ogSha) bad.push(`${path}: og:image file was not rendered from card ${card.key}`);
  // Same words: both alts carry the card's headline, and say the same thing.
  if (!alt.startsWith(card.headline + ' ')) bad.push(`${path}: first image alt does not start with the headline "${card.headline}"`);
  if (ogAlt !== `AEO Analyzers: ${alt}`) bad.push(`${path}: og:image:alt and the first image alt differ`);
  return bad;
}

describe('the first image under the title is the page’s own share card', () => {
  const pages: { path: string }[] = PLAN.pages;
  it('covers every blog, how-to, guide and ledger page in the plan', () => {
    expect(pages.length).toBeGreaterThanOrEqual(25);
    for (const p of pages) expect(existsSync(pageFile(p.path)), p.path).toBe(true);
  });
  it('same card source and same headline for the first image and og:image, on every page', () => {
    const bad = pages.flatMap((p) => checkPage(p.path, readFileSync(pageFile(p.path), 'utf8'), ART[p.path]));
    expect(bad).toEqual([]);
  });
  it('fails when the first image comes from another card, or the og alt carries another headline', () => {
    const p = pages.find((x) => x.path === '/blog/found-not-recommended')!;
    const html = readFileSync(pageFile(p.path), 'utf8');
    const other = ART['/evidence'];
    const swapped = html.replace(ART[p.path].hero, other.hero);
    expect(checkPage(p.path, swapped, ART[p.path]).some((e) => /first image/.test(e))).toBe(true);
    const reworded = html.replace(/(<meta property="og:image:alt" content="AEO Analyzers: )[^"]*/, '$1Some other headline.');
    expect(checkPage(p.path, reworded, ART[p.path]).some((e) => /og:image:alt/.test(e))).toBe(true);
  });
  it('no page still shows a separate hero (the old abstract art files)', () => {
    for (const p of pages) expect(readFileSync(pageFile(p.path), 'utf8'), p.path).not.toMatch(/\/img\/blog\/2026-11\/[a-z0-9-]+-hero\.webp/);
  });
});
