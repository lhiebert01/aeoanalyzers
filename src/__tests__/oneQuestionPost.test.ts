import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
/** WO-AEO-BLOG-ONE-QUESTION-001 — the one outcome test the order asks for. The page is
 *  gated: noindex until the founder says go, and the sitemap guard already forbids listing
 *  a noindex page. On go, the same test flips to demand indexability + a sitemap entry. */
const root=(p:string)=>readFileSync(resolve(__dirname,'..','..',p),'utf8');
const page=root('public/blog/one-question-is-not-a-measurement/index.html');
const GO = !/content="noindex/.test(page);
describe('One question is not a measurement — rendered and wired', () => {
  it('renders the H1 and the required header line', () => {
    expect(page).toContain('<h1 class="posttitle">One Question Is Not a Measurement</h1>');
    expect(page).toContain('AEO Analyzers · Category education · Last reviewed 2026-10-01');
  });
  it('carries Article JSON-LD with the canonical Person and Org ids', () => {
    expect(page).toContain('"@type": "Article"');
    expect(page).toContain('"@id": "https://pigenai.com/#lindsay"');
    expect(page).toContain('"@id": "https://pigenai.com/#org"');
    expect(page).not.toContain('FAQPage');
  });
  it('links are bare https URLs with no wrappers or UTM', () => {
    const body = page.slice(page.indexOf('<article'), page.indexOf('</article>'));
    for (const m of body.matchAll(/<a href="(https:\/\/[^"]+)">([^<]+)<\/a>/g)) {
      expect(m[1]).toBe(m[2]); expect(m[1]).not.toMatch(/utm_|\?/);
    }
  });
  it('the blog index carries the card in the specified slot', () => {
    const idx=root('public/blog/index.html');
    // the cards, not the Blog JSON-LD that precedes them
    const a=idx.indexOf('<h2><a href="/blog/why-ai-doesnt-mention-you">'), b=idx.indexOf('<h2><a href="/blog/one-question-is-not-a-measurement">'), c=idx.indexOf('<h2><a href="/blog/how-it-works">');
    expect(a).toBeGreaterThan(-1); expect(b).toBeGreaterThan(a); expect(c).toBeGreaterThan(b);
    expect(idx).toContain('Read the piece &rarr;');
  });
  it('the cross-link sits under "Why is one run not a measurement?"', () => {
    const p=root('public/what-should-an-aeo-tool-do/index.html');
    // the rendered H2, not the FAQPage JSON-LD copy of the question
    const h=p.indexOf('<h2 class="posth2">Why is one run not a measurement?</h2>'); const x=p.indexOf('/blog/one-question-is-not-a-measurement');
    expect(h).toBeGreaterThan(-1); expect(x).toBeGreaterThan(h); expect(x-h).toBeLessThan(1500);
  });
  it('llms.txt lists it', () => { expect(root('public/llms.txt')).toContain('/blog/one-question-is-not-a-measurement'); });
  it(GO ? 'GO: indexable and in the sitemap' : 'GATED: noindex and NOT in the sitemap', () => {
    const sm=root('public/sitemap.xml');
    if (GO) { expect(page).toContain('content="index,follow'); expect(sm).toContain('/blog/one-question-is-not-a-measurement</loc>'); }
    else    { expect(page).toContain('content="noindex,nofollow"'); expect(sm).not.toContain('one-question-is-not-a-measurement'); }
  });
});
