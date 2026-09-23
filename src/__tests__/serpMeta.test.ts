import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Bing Webmaster flagged /blog/i-scored-zero and /blog/ on 23 Sep 2026: title too long,
 *  description too long, no markup. Measured across every prerendered page it was the whole
 *  class — 6 titles over 65, 10 descriptions over 160, one page with no JSON-LD. <title> and
 *  the description are the tab, the SERP snippet and the share card; the H1 is not checked
 *  here and may stay long. */
const root = resolve(__dirname, '..', '..', 'public');
const pages: string[] = [];
for (const d of readdirSync(root)) {
  if (existsSync(resolve(root, d, 'index.html'))) pages.push(`${d}/index.html`);
  if (d === 'blog') for (const s of readdirSync(resolve(root, 'blog')))
    if (existsSync(resolve(root, 'blog', s, 'index.html'))) pages.push(`blog/${s}/index.html`);
}
const un = (s: string) => s.replace(/&rsquo;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&mdash;/g, '—').replace(/&ldquo;|&rdquo;/g, '"');

describe('every prerendered page fits the SERP', () => {
  it('found the pages', () => expect(pages.length).toBeGreaterThan(8));
  for (const p of pages) {
    const h = readFileSync(resolve(root, p), 'utf8');
    it(`${p}: <title> ≤ 65 chars`, () => {
      const t = un(/<title>([\s\S]*?)<\/title>/.exec(h)![1].trim());
      expect(t.length, `"${t}"`).toBeLessThanOrEqual(65);
    });
    it(`${p}: description 50–160 chars`, () => {
      const d = un(/<meta name="description" content="([^"]*)"/.exec(h)![1]);
      expect(d.length, `"${d}"`).toBeLessThanOrEqual(160);
      expect(d.length).toBeGreaterThanOrEqual(50);
    });
    it(`${p}: carries at least one JSON-LD block`, () => {
      expect(h).toContain('application/ld+json');
    });
  }
});
