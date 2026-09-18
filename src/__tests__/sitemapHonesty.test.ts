import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Sitemap honesty (audit Sep 7 2026).
 *
 *  This is a single-page app: every path returns HTTP 200, so a status code
 *  cannot tell a real page from the SPA fallback. A URL serves its own content
 *  only if something emits a distinct file for it —
 *    • a static page committed at `public/<route>/index.html`, or
 *    • the root, which `scripts/prerender.mjs` renders into `dist/index.html`.
 *  Anything else in the sitemap resolves to a byte-identical copy of the
 *  prerendered homepage, which is a duplicate-content signal aimed at exactly
 *  the crawlers this product exists to measure.
 *
 *  The audit found five such URLs listed while four real pages were missing.
 *  This test asserts the outcome — every listed URL has a source of its own, and
 *  every real page is listed — rather than trusting the author to remember. */

const ROOT = resolve(__dirname, '../..');
const sitemap = readFileSync(resolve(ROOT, 'public/sitemap.xml'), 'utf8');

const listedPaths = [...sitemap.matchAll(/<loc>https:\/\/aeoanalyzers\.com([^<]*)<\/loc>/g)]
  .map((m) => m[1] || '/');

/** Routes the prerender step emits a distinct document for. Add a route here in the
 *  same commit that teaches the prerender to emit it — and the build's own
 *  scripts/check-prerender.mjs fails if the prerender then does not produce it, so the
 *  two lists cannot drift apart silently. Verified live on 2026-09-18: five distinct
 *  documents of 58503, 25574, 37556, 14427 and 14303 bytes. */
const PRERENDERED = new Set(['/', '/pricing', '/guide', '/privacy', '/terms']);

function hasOwnSource(path: string): boolean {
  if (PRERENDERED.has(path)) return true;
  const clean = path.replace(/^\/|\/$/g, '');
  return existsSync(resolve(ROOT, 'public', clean, 'index.html'));
}

describe('sitemap lists only URLs that serve their own content', () => {
  it('every listed URL has a distinct source document', () => {
    const shellOnly = listedPaths.filter((p) => !hasOwnSource(p));
    expect(shellOnly).toEqual([]);
  });

  /** A page carrying `robots: noindex` is deliberately withheld — a review gate, a
   *  draft, an internal page. It must be ABSENT from the sitemap: listing a page you
   *  have told crawlers not to index is a contradiction they will believe half of. */
  const isNoindex = (file: string) =>
    /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(readFileSync(resolve(ROOT, file), 'utf8'));

  const staticPages = () => {
    const { execFileSync } = require('node:child_process') as typeof import('node:child_process');
    return execFileSync('git', ['ls-files', 'public'], { encoding: 'utf8' })
      .split('\n')
      .filter((f) => f.endsWith('/index.html'))
      .map((f) => ({ file: f, path: '/' + f.replace(/^public\//, '').replace(/index\.html$/, '').replace(/\/$/, '') }));
  };

  it('every committed INDEXABLE static page is listed', () => {
    const missing = staticPages()
      .filter((p) => !isNoindex(p.file))
      .filter((p) => ![p.path, `${p.path}/`].some((v) => listedPaths.includes(v)))
      .map((p) => p.path);
    expect(missing).toEqual([]);
  });

  it('no noindex page is listed in the sitemap', () => {
    const contradictions = staticPages()
      .filter((p) => isNoindex(p.file))
      .filter((p) => [p.path, `${p.path}/`].some((v) => listedPaths.includes(v)))
      .map((p) => p.path);
    expect(contradictions).toEqual([]);
  });

  it('no listed URL duplicates another', () => {
    const seen = listedPaths.map((p) => p.replace(/\/$/, '') || '/');
    expect(new Set(seen).size).toBe(seen.length);
  });
});

/** Every prerendered route must declare its own head tags. /pricing shipped with NO
 *  <title>, canonical or description, because the payments view rendered no <SEO>
 *  block and the prerender's title handling then dropped the static fallback as well.
 *  It was the page that takes money, and the gap was invisible until the route
 *  started prerendering at all. Prove by breaking: delete the SEO block from the
 *  payments view and this goes red. */
describe('every prerendered public view declares its own head tags', () => {
  const app = (() => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { resolve } = require('node:path') as typeof import('node:path');
    return readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
  })();

  it('the payments view renders an SEO block with a canonical', () => {
    const block = app.slice(app.indexOf("{view === 'payments' && ("), app.indexOf('<Payments'));
    expect(block).toContain('<SEO');
    expect(block).toContain('canonical="https://aeoanalyzers.com/pricing"');
    expect(block).toMatch(/title="Pricing/);
  });

  it('privacy and terms still declare theirs', () => {
    for (const view of ['privacy', 'terms']) {
      const i = app.indexOf(`{view === '${view}' && (`);
      expect(app.slice(i, i + 1200), `${view} lost its SEO block`).toContain('<SEO');
    }
  });

  it('a public view is only public if the auth reset spares it', () => {
    // PUBLIC_VIEWS is what stops handleSession dragging a public URL to the homepage.
    const m = app.match(/const PUBLIC_VIEWS: View\[\] = \[([^\]]*)\]/);
    expect(m, 'PUBLIC_VIEWS must exist').toBeTruthy();
    for (const v of ['payments', 'guide', 'privacy', 'terms', 'press']) {
      expect(m![1], `${v} must be public`).toContain(`'${v}'`);
    }
  });
});
