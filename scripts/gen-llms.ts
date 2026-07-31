// Generate a spec-compliant llms.txt + llms-full.txt for a domain, validate them,
// and drift-diff llms.txt against the LIVE-served file. WO-QA-003 E3.
//
//   EXEC_DOMAIN=aeoanalyzers.com npx tsx scripts/gen-llms.ts
//
// Writes <EXEC_OUT default exec-out>/<domain>.llms.txt and .llms-full.txt and prints
// validation + drift. Nothing is deployed — review, then place the file yourself.

import { writeFileSync, mkdirSync } from 'node:fs';
import {
  extractLlmsDoc, renderLlmsTxt, renderLlmsFullTxt, validateLlmsTxt, diffLlmsTxt,
} from '../src/lib/llmsTxt.js';

const domain = (process.env.EXEC_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
const outDir = process.env.EXEC_OUT || 'exec-out';
if (!domain) { console.error('EXEC_DOMAIN is required'); process.exit(1); }

const UA = 'Mozilla/5.0 (compatible; AEOAnalyzers-llms/1.0; +https://aeoanalyzers.com)';
async function get(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, redirect: 'follow' });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}
const toText = (html: string) => String(html || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

async function main() {
  const origin = `https://${domain}`;
  const html = (await get(origin)) || (await get(`https://www.${domain}`)) || '';
  if (!html) { console.error(`could not read ${domain}`); process.exit(1); }

  const doc = extractLlmsDoc(html, domain);
  const llms = renderLlmsTxt(doc);
  const v = validateLlmsTxt(llms);

  // llms-full.txt: homepage + up to 4 priority internal pages (best-effort).
  const pages: { title: string; url: string; text: string }[] = [{ title: doc.title, url: origin, text: toText(html) }];
  for (const l of doc.sections[0]?.links.slice(0, 4) || []) {
    const ph = await get(l.url);
    if (ph) pages.push({ title: l.name, url: l.url, text: toText(ph).slice(0, 4000) });
  }
  const full = renderLlmsFullTxt(doc.title, pages);

  const live = await get(`${origin}/llms.txt`);
  const drift = diffLlmsTxt(llms, live);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/${domain}.llms.txt`, llms);
  writeFileSync(`${outDir}/${domain}.llms-full.txt`, full);

  console.error(`llms.txt: ${v.valid ? 'VALID' : 'INVALID — ' + v.issues.join(' ')}`);
  console.error(live ? (drift.identical ? 'live /llms.txt: in sync' : `live /llms.txt drift: +${drift.urlsOnlyInGenerated.length} to add, ${drift.urlsOnlyInLive.length} only-live`) : 'no live /llms.txt served — generated one is all-new');
  console.error(`wrote ${outDir}/${domain}.llms.txt (+ .llms-full.txt). Review before deploying — nothing was placed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
