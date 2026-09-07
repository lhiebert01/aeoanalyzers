// Post-build prerender for aeoanalyzers.com (see docs/prerender-plan.md).
//
// The app is a single-URL, state-based Vite SPA, so `vite build` emits an empty
// `<div id="root"></div>` shell that AI crawlers can't read. This renders `/`
// (the anonymous MarketingLanding) in real headless Chromium and overwrites
// dist/index.html with the fully-rendered HTML — body + react-helmet-injected
// meta + JSON-LD. Humans still hydrate the SPA on top.
//
// Fail-open: any error logs a warning and exits 0 without touching index.html,
// so a constrained CI container can never break the build.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Head tags that must appear at most once. We keep the first occurrence of each
// and drop later duplicates (react-helmet's set vs the static fallback baked into
// index.html). The landing page uses a single OG image, so og:image and its
// sub-properties are deduped too (keeping the static block, which carries the
// alt text helmet omits). Title and rel="canonical" are handled separately below.
const UNIQUE_META = new Set([
  'description', 'keywords', 'author', 'publisher', 'theme-color', 'robots',
  'googlebot', 'bingbot', 'og:title', 'og:description', 'og:type', 'og:url',
  'og:site_name', 'og:locale', 'og:image', 'og:image:secure_url',
  'og:image:width', 'og:image:height', 'og:image:type', 'og:image:alt',
  'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image',
  'twitter:site', 'twitter:creator', 'article:author', 'article:published_time',
]);

function dedupeHeadTags(html) {
  // Scope all deduping to <head> only, so we never touch an SVG icon's <title>
  // or any meta-like content in the rendered body.
  const headEnd = html.search(/<\/head>/i);
  if (headEnd === -1) return html;
  let head = html.slice(0, headEnd);
  const rest = html.slice(headEnd);

  // Collapse multiple <title>…</title> to the first.
  let sawTitle = false;
  head = head.replace(/<title>[\s\S]*?<\/title>/gi, (m) => (sawTitle ? '' : ((sawTitle = true), m)));
  // Collapse multiple <link rel="canonical"> to the first.
  let sawCanonical = false;
  head = head.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, (m) => (sawCanonical ? '' : ((sawCanonical = true), m)));
  // Dedupe must-be-unique <meta> tags by their name/property key.
  const seen = new Set();
  head = head.replace(/<meta\b[^>]*>/gi, (tag) => {
    const key = (tag.match(/\b(?:name|property)=["']([^"']+)["']/i) || [])[1];
    if (!key || !UNIQUE_META.has(key)) return tag;
    if (seen.has(key)) return '';
    seen.add(key);
    return tag;
  });
  return head + rest;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const INDEX = path.join(DIST, 'index.html');

/** Routes that get their OWN prerendered document. Keep in lockstep with
 *  public/sitemap.xml and PRERENDERED in src/__tests__/sitemapHonesty.test.ts.
 *  Admin routes are deliberately excluded — they must never be prerendered. */
/** route -> a phrase that appears ONLY on that route once it has rendered. The
 *  prerender waits for it, so a route that never switches view is skipped rather
 *  than written as a copy of the homepage. App.tsx has a 2s auth safety timeout,
 *  so these waits must outlast it. */
const ROUTES = [
  { path: '/', marker: null },
  { path: '/pricing', marker: 'Choose your AEO Tier' },
  { path: '/guide', marker: 'Getting Started' },
  { path: '/privacy', marker: 'Our commitment to' },
  { path: '/terms', marker: 'Acceptance of Terms' },
];
// /analyzer and /sweeps are app surfaces behind sign-in and are deliberately NOT
// prerendered; /admin never is. /press is added the day that page exists.
const PORT = 4317;
const WAIT_SELECTOR = '#hero-title'; // MarketingLanding hero — present only after React renders

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.txt': 'text/plain', '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        let filePath = path.join(DIST, urlPath);
        // SPA fallback: anything without a file extension serves index.html.
        if (urlPath === '/' || !path.extname(filePath) || !existsSync(filePath)) {
          filePath = INDEX;
        }
        const body = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404); res.end('not found');
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function main() {
  if (!existsSync(INDEX)) {
    console.warn('[prerender] dist/index.html not found — skipping.');
    return;
  }

  let puppeteer, chromium;
  try {
    puppeteer = (await import('puppeteer-core')).default;
    chromium = (await import('@sparticuz/chromium')).default;
  } catch {
    console.warn('[prerender] puppeteer-core/@sparticuz/chromium not installed — skipping (shipping SPA shell).');
    return;
  }

  const server = await startServer();
  let browser;
  try {
    // @sparticuz/chromium ships a Chromium that runs in lib-bare environments
    // like Vercel's build container (full puppeteer Chromium fails there with
    // "libnspr4.so: cannot open shared object file"). PUPPETEER_EXECUTABLE_PATH
    // overrides it (e.g. a local system Chrome for testing).
    chromium.setGraphicsMode = false;
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath());
    browser = await puppeteer.launch({
      args: [...chromium.args, '--disable-dev-shm-usage'],
      executablePath,
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; AEOAnalyzersPrerender/1.0)');

    // Render each route to its OWN document. Before Sep 7 2026 only "/" was
    // prerendered, so /pricing, /how-it-works, /guide, /privacy and /terms all
    // served a byte-identical copy of the homepage via the SPA rewrite — five URLs,
    // one document, and our own pricing and terms unreadable to anything that does
    // not run JavaScript. Each route below writes dist/<route>/index.html, which
    // Vercel serves ahead of the rewrite (the same mechanism the blog pages use).
    // Adding a route here means also adding it to public/sitemap.xml and to
    // PRERENDERED in src/__tests__/sitemapHonesty.test.ts, in the same commit.
    for (const route of ROUTES) {
      try {
        await renderRoute(page, route.path, route.marker);
      } catch (e) {
        // Fail-open per route: one bad route must not cost the others or the build.
        console.warn(`[prerender] ${route.path} failed (${e?.message || e}) — SPA fallback for this route.`);
      }
    }
  } catch (err) {
    console.warn('[prerender] failed (shipping SPA shell):', err?.message || err);
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.close();
  }
}

/** Render one route and write its own document. */
async function renderRoute(page, route, marker) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
    // The landing hero proves React mounted. For a non-root route the path->view
    // effect runs just after mount, so give it a beat to settle before capturing —
    // otherwise every route captures the landing page, which is the bug being fixed.
    if (!marker) {
      await page.waitForSelector(WAIT_SELECTOR, { timeout: 15000 });
    } else {
      // Wait for the route's OWN content. App.tsx maps path -> view in an effect and
      // has a 2s auth safety timeout, so this must outlast both. If the phrase never
      // appears the route did not switch view, and we must not write a duplicate.
      await page.waitForFunction(
        (m) => document.body && document.body.innerText.includes(m),
        { timeout: 20000 },
        marker
      );
    }

    // Sanity: confirm real content rendered before we write anything.
    let html = await page.content();
    if (marker && !html.includes(marker)) {
      console.warn(`[prerender] ${route}: marker "${marker}" absent after render — skipping.`);
      return;
    }
    if (!marker && !/Secure your|Citation|Simulation/i.test(html)) {
      console.warn(`[prerender] ${route}: rendered HTML lacks expected content — skipping overwrite.`);
      return;
    }
    // The app derives some URLs from window.location.origin, which during
    // prerender is the local server. Rewrite those back to the production origin
    // so og:image/og:url/canonical/JSON-LD don't leak localhost into the snapshot.
    const localOrigin = `http://localhost:${PORT}`;
    html = html.split(localOrigin).join('https://aeoanalyzers.com');

    // Dedupe head tags. index.html ships a static fallback set of <title>/meta/og
    // so the page is never tagless if prerender is skipped (fail-open). But
    // react-helmet (SEO.tsx) injects its own canonical set during render — and it
    // interleaves them with the static ones — so the prerendered HTML ends up with
    // two of each. Keep the FIRST occurrence of every must-be-unique tag and drop
    // the rest (helmet emits its <title> first; the meta texts are identical so
    // order is immaterial). Guarded per-key so we can never strip down to zero.
    html = dedupeHeadTags(html);

    // REFUSE to write a duplicate. If a route renders the same document as the
    // homepage it is not a distinct page, and writing it would recreate exactly the
    // duplicate-content problem this change removes. Skipping leaves the SPA
    // fallback in place and keeps the route out of the sitemap honestly.
    if (route !== '/') {
      // Compare the BODY, not the whole document: canonical and og:url legitimately
      // differ per route, so a whole-document comparison never matches and the guard
      // would never fire.
      const bodyOf = (h) => (h.match(/<body[^>]*>([\s\S]*)<\/body>/i) || ['', ''])[1];
      const home = readFileSync(INDEX, 'utf8');
      if (bodyOf(home) === bodyOf(html)) {
        console.warn(`[prerender] ${route}: renders the same document as / — NOT written (would be a duplicate).`);
        return;
      }
    }

    const out = route === '/' ? INDEX : path.join(DIST, route.replace(/^\//, ''), 'index.html');
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, '<!doctype html>\n' + html.replace(/^<!doctype html>/i, ''), 'utf8');
    console.log(`[prerender] ${route} -> ${path.relative(DIST, out)} (${html.length} bytes)`);
}

// Watchdog: never let prerender hang a CI build. If it hasn't finished in 120s,
// exit 0 and ship whatever is in dist/ (the SPA shell at worst).
const watchdog = setTimeout(() => {
  console.warn('[prerender] watchdog timeout (120s) — shipping current dist/.');
  process.exit(0);
}, 120000);
watchdog.unref();

main()
  .catch((e) => {
    console.warn('[prerender] unexpected error (non-fatal):', e?.message || e);
  })
  .finally(() => {
    clearTimeout(watchdog);
    process.exit(0);
  });
