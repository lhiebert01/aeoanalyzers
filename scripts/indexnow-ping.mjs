// IndexNow — tell Bing (and Yandex, Seznam, Naver) which URLs changed, the moment they change.
//
// WHY. Bing's own URL inspection on 23 Sep 2026 returned "discovered but not crawled" on four
// pages and recommended "submitting your newly added, updated, and deleted URLs using Bing URL
// Submission API". That API is IndexNow. Without it, every content push meant pasting nine URLs
// into a form by hand. Google does not use IndexNow; this changes nothing for Google.
//
// THE KEY IS PUBLIC BY PROTOCOL. IndexNow verifies ownership by fetching https://<host>/<key>.txt
// and checking it contains the key, so the key lives in public/ and is committed on purpose. It
// is not a secret and grants nothing beyond "this host asserts these URLs changed".
//
// WHAT IT SENDS. Only URLs from public/sitemap.xml — the same set the freshness guard keeps
// honest — filtered to those whose <lastmod> is within --days (default 2), or all of them with
// --all. Nothing is invented and nothing outside the sitemap can be submitted.
//
//   node scripts/indexnow-ping.mjs --dry-run      print the payload, send nothing
//   node scripts/indexnow-ping.mjs                 send URLs changed in the last 2 days
//   node scripts/indexnow-ping.mjs --all           send every sitemap URL (first run)
//   node scripts/indexnow-ping.mjs --days 7
import { readFileSync } from 'node:fs';

export const HOST = 'aeoanalyzers.com';
export const KEY = '707847cc5de518c28a2d38b22ec73aef';
export const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

export function urlsFromSitemap(xml, { days = 2, all = false, now = new Date() } = {}) {
  const out = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = /<loc>(.*?)<\/loc>/.exec(m[1])?.[1];
    const lastmod = /<lastmod>(.*?)<\/lastmod>/.exec(m[1])?.[1];
    if (!loc || !loc.startsWith(`https://${HOST}/`)) continue;
    if (all) { out.push(loc); continue; }
    if (!lastmod) continue;
    const age = (now - new Date(lastmod + 'T00:00:00Z')) / 86400000;
    if (age <= days) out.push(loc);
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry-run'), all = args.includes('--all');
  const di = args.indexOf('--days'); const days = di >= 0 ? Number(args[di + 1]) : 2;
  const xml = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  const urlList = urlsFromSitemap(xml, { days, all });
  const body = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };
  console.log(`IndexNow: ${urlList.length} URL(s)${all ? ' (all)' : ` changed in the last ${days} day(s)`}`);
  for (const u of urlList) console.log('  ' + u);
  if (!urlList.length) return;
  if (dry) { console.log('--dry-run: nothing sent'); return; }
  // the key file must be live before the first ping, or the engines reject the host
  const k = await fetch(KEY_LOCATION); const kt = (await k.text()).trim();
  if (!k.ok || kt !== KEY) { console.error(`key file not served correctly at ${KEY_LOCATION} (HTTP ${k.status})`); process.exit(1); }
  const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
  console.log(`IndexNow response: HTTP ${r.status} ${r.statusText}`);   // 200 OK, 202 Accepted
  if (r.status !== 200 && r.status !== 202) { console.error(await r.text()); process.exit(1); }
}
if (import.meta.url === `file://${process.argv[1]}`) main();
