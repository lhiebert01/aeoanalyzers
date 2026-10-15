// WO-014 F — re-verify every directory start URL in src/data/directories-catalog.json.
// Exit 1 when any entry that was verified no longer returns 200, or a challenged one now 404s/5xx.
// Run quarterly by .github/workflows/catalog-check.yml; a failed scheduled run emails the repo
// owner (GitHub's default notification). `--write` updates last_verified/check_result in place.
import { readFileSync, writeFileSync } from 'node:fs';
const FILE = process.env.CATALOG_FILE || 'src/data/directories-catalog.json';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const cat = JSON.parse(readFileSync(FILE, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const failures = [];
for (const e of cat.entries) {
  let status = 0, challenge = false;
  try {
    const r = await fetch(e.start_url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    status = r.status; challenge = status === 403 && (r.headers.get('cf-mitigated') === 'challenge' || /cloudflare/i.test(r.headers.get('server') || ''));
  } catch (err) { status = 0; }
  const ok = status === 200 || challenge;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${e.id.padEnd(16)} ${status}${challenge ? ' (challenge)' : ''} ${e.start_url}`);
  if (!ok || (e.verified && status !== 200)) failures.push(`${e.name}: ${e.start_url} returned ${status || 'no response'}${challenge ? ' (bot challenge)' : ''}`);
  if (process.argv.includes('--write') && ok) {
    e.last_verified = today; e.verified = status === 200;
    e.check_result = status === 200 ? 'HTTP 200' : 'HTTP 403, Cloudflare challenge: the site is up, but the page could not be confirmed by a script';
  }
}
if (process.argv.includes('--write') && !failures.length) { cat.verified_at = today; writeFileSync(FILE, JSON.stringify(cat, null, 1) + '\n'); }
if (failures.length) { console.error('\nDirectory catalog check failed:\n- ' + failures.join('\n- ')); process.exit(1); }
console.log(`\nAll ${cat.entries.length} start URLs checked ${today}.`);
