// High-quality marketing screenshot library for aeoanalyzers.com.
// Adapted from macrolens/scripts/capture_launch_screenshots.mjs (proven), but
// driven by puppeteer-core + @sparticuz/chromium (the engine that runs in this
// environment / on Vercel) instead of Playwright.
//
// Captures the live landing at 4 viewports (full-page), exact-dimension social
// share cards (LinkedIn/FB/X/Substack/Medium), and per-section crops — all at
// 2x DPR. Output: images/marketing/launch-<YYYY-MM-DD>/
//
// Run: node scripts/screenshotLibrary.mjs  [baseUrl]
// Note: analyzer/pricing/results views are behind login — not captured here.

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = (process.argv[2] || 'https://www.aeoanalyzers.com/').replace(/\/$/, '') + '/';
const TODAY = new Date().toISOString().split('T')[0];
const OUT = path.resolve(__dirname, '..', 'images', 'marketing', `launch-${TODAY}`);
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

// Above-fold hero crops at canonical share dimensions.
const SOCIAL_CARDS = {
  'linkedin-1200x627': { width: 1200, height: 627 },
  'facebook-1200x630': { width: 1200, height: 630 },
  'facebook-square-1080': { width: 1080, height: 1080 },
  'twitter-1200x675': { width: 1200, height: 675 },
  'substack-1456x816': { width: 1456, height: 816 },
  'medium-1600x900': { width: 1600, height: 900 },
};

const SECTIONS = [
  { sel: 'section[aria-labelledby="hero-title"]', name: 'section-hero' },
  { sel: 'section[aria-labelledby="gap-title"]', name: 'section-ai-search-gap' },
  { sel: 'section[aria-labelledby="trust-title"]', name: 'section-why-analyzers' },
  { sel: 'section[aria-labelledby="personas-title"]', name: 'section-who-its-for' },
  { sel: 'section[aria-labelledby="dev-title"]', name: 'section-developers' },
];

const chromium = (await import('@sparticuz/chromium')).default;
const puppeteer = (await import('puppeteer-core')).default;
chromium.setGraphicsMode = false;

const browser = await puppeteer.launch({
  args: [...chromium.args, '--disable-dev-shm-usage'],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath()),
  headless: chromium.headless,
});

const settle = (ms) => new Promise((r) => setTimeout(r, ms));
let count = 0;

try {
  console.log(`\nAEO Analyzers screenshot run · ${BASE}\nOutput: ${OUT}\n`);

  // --- Full-page captures at each viewport ---
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const page = await browser.newPage();
    await page.setViewport({ ...vp, deviceScaleFactor: 2, isMobile: vpName === 'mobile' });
    try {
      await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 45000 });
      await page.waitForSelector('#hero-title', { timeout: 20000 });
      await settle(1500);
      const out = path.join(OUT, `landing-${vpName}.png`);
      await page.screenshot({ path: out, fullPage: true });
      console.log(`  ✓ landing-${vpName}.png`); count++;
      // section crops only need to run once (desktop)
      if (vpName === 'laptop') {
        for (const s of SECTIONS) {
          const el = await page.$(s.sel);
          if (!el) { console.warn(`    (missing ${s.name})`); continue; }
          await el.scrollIntoView(); await settle(500);
          await el.screenshot({ path: path.join(OUT, `${s.name}.png`) });
          console.log(`  ✓ ${s.name}.png`); count++;
        }
      }
    } catch (e) { console.error(`  ✗ landing-${vpName}: ${e?.message || e}`); }
    await page.close();
  }

  // --- Social share cards (hero, exact dimensions) ---
  for (const [name, vp] of Object.entries(SOCIAL_CARDS)) {
    const page = await browser.newPage();
    await page.setViewport({ ...vp, deviceScaleFactor: 2 });
    try {
      await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 45000 });
      await page.waitForSelector('#hero-title', { timeout: 20000 });
      await settle(1200);
      await page.screenshot({ path: path.join(OUT, `social-${name}.png`), fullPage: false });
      console.log(`  ✓ social-${name}.png`); count++;
    } catch (e) { console.error(`  ✗ social-${name}: ${e?.message || e}`); }
    await page.close();
  }
} finally {
  await browser.close().catch(() => {});
}
console.log(`\nDone. ${count} captures saved to ${OUT}\n`);
