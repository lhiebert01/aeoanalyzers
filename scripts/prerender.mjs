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
import { writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const INDEX = path.join(DIST, 'index.html');
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
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector(WAIT_SELECTOR, { timeout: 15000 });

    // Sanity: confirm real value-prop content rendered before we overwrite.
    const html = await page.content();
    if (!/Secure your|Citation|Simulation/i.test(html)) {
      console.warn('[prerender] rendered HTML lacks expected content — skipping overwrite.');
      return;
    }
    writeFileSync(INDEX, '<!doctype html>\n' + html.replace(/^<!doctype html>/i, ''), 'utf8');
    console.log(`[prerender] wrote prerendered landing to dist/index.html (${html.length} bytes).`);
  } catch (err) {
    console.warn('[prerender] failed (shipping SPA shell):', err?.message || err);
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.close();
  }
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
