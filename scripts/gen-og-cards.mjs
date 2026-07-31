// WO-BLOG-OG-IMAGES-001 — render the three per-post blog OG cards to PNG.
// Ratified template: 1200×630, ink field, teal accents, Space Grotesk display /
// Inter supporting, kicker "AEOANALYZERS.COM · BLOG", title line, straight baseline.
// Flat vector — no gradients/glow/mockups/stock. No invented numbers on the card.
//
//   node scripts/gen-og-cards.mjs      → writes public/og-blog-*.png
//
// Uses the same puppeteer-core + @sparticuz/chromium engine as the prerender.

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'public');

const CARDS = [
  { file: 'og-blog-i-scored-zero.png', title: 'I Ran My Own Tool on My Own Site. It Scored <span class="hot">0%.</span>' },
  { file: 'og-blog-what-you-actually-get.png', title: 'What You Actually Get: The Action Plan Inside Every Citation Sweep' },
  { file: 'og-blog-are-you-the-answer.png', title: 'Is Your Brand the Answer AI Gives — or Is a Competitor?' },
];

const html = (titleHtml) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *{margin:0;box-sizing:border-box}
  html,body{width:1200px;height:630px}
  .card{width:1200px;height:630px;background:#0E1B16;color:#F3F7F5;
    font-family:'Inter',sans-serif;padding:72px 84px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
  .top{display:flex;align-items:center;gap:18px}
  .mk{width:46px;height:46px;border-radius:12px;background:#0B6E7A;color:#fff;display:flex;align-items:center;justify-content:center;
    font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:26px}
  .kicker{font-family:'Inter',sans-serif;font-weight:600;font-size:21px;letter-spacing:.2em;text-transform:uppercase;color:#63D3C7}
  .title{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:60px;line-height:1.08;letter-spacing:-.015em;color:#F3F7F5;max-width:1032px}
  .title .hot{color:#63D3C7}
  .foot{display:flex;align-items:center;gap:20px}
  .rule{height:8px;width:120px;background:#0B6E7A;border-radius:4px}
  .url{font-family:'Inter',sans-serif;font-weight:500;font-size:22px;color:#9FB4AE}
</style></head>
<body><div class="card">
  <div class="top"><div class="mk">A</div><div class="kicker">AEOANALYZERS.COM · BLOG</div></div>
  <div class="title">${titleHtml}</div>
  <div class="foot"><div class="rule"></div><div class="url">aeoanalyzers.com</div></div>
</div></body></html>`;

const chromium = (await import('@sparticuz/chromium')).default;
const puppeteer = (await import('puppeteer-core')).default;
chromium.setGraphicsMode = false;

const browser = await puppeteer.launch({
  args: [...chromium.args, '--disable-dev-shm-usage', '--force-color-profile=srgb'],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath()),
  headless: chromium.headless,
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 }); // exact 1200×630
  for (const c of CARDS) {
    // 'load' (not networkidle0) — the Google Fonts <link> keeps a connection open
    // so networkidle0 can hang; we wait on document.fonts.ready explicitly instead.
    await page.setContent(html(c.title), { waitUntil: 'load', timeout: 20000 });
    await page.evaluate(async () => { try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]); } catch {} });
    await new Promise((r) => setTimeout(r, 500)); // let webfonts paint
    const el = await page.$('.card');
    const buf = await el.screenshot({ type: 'png' });
    writeFileSync(path.join(OUT, c.file), buf);
    console.error(`wrote public/${c.file} (${buf.length} bytes)`);
  }
} finally {
  await browser.close();
}
