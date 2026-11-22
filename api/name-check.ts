// Free name-collision check for sweep setup (Nov 22 2026, from the usesignalatlas.com sweep, where
// most branded answers described other products called Signal Atlas). Before a customer runs a sweep,
// look for other live products with the same name: sites on the brand's likely domains and code
// repositories with exactly that name. No model call, no sweep, no charge. Signed-in users only, so
// the route is not an open fetch proxy.
//
// POST { brand, domain } -> { collisions: [{ name, where, kind }], checked: string[] }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isPaidRequest } from './_lib/entitlement.js';
import { namespaceCollisionRisk } from '../src/lib/namespaceCollision.js';

export const config = { maxDuration: 30 };

const PARKED = /domain (?:is|may be) for sale|buy this domain|this domain is parked|parked free|godaddy|sedo|dan\.com|afternic|hugedomains|domain names? for sale|coming soon|under construction|account suspended|default web site page|welcome to nginx|index of \//i;
const registrable = (h: string) => h.toLowerCase().replace(/^www\./, '').split('.').slice(-2).join('.');

async function probe(host: string, ownDomain: string): Promise<{ where: string; name: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4500);
  try {
    const r = await fetch(`https://${host}`, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AEOAnalyzersNameCheck/1.0)', Accept: 'text/html' } });
    if (!r.ok) return null;
    const finalHost = new URL(r.url).hostname.toLowerCase().replace(/^www\./, '');
    // A domain that forwards to the customer's own site is theirs.
    if (finalHost === ownDomain || registrable(finalHost) === registrable(ownDomain)) return null;
    const html = (await r.text()).slice(0, 60000);
    const title = ((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s+/g, ' ').trim();
    // A page titled only with its own address is a placeholder, not a product.
    if (!title || PARKED.test(title) || PARKED.test(html.slice(0, 4000)) || title.toLowerCase().replace(/^www\./, '') === host) return null;
    return { where: finalHost === host ? host : `${host} (→ ${finalHost})`, name: title.slice(0, 90) };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const ent = await isPaidRequest(req);
  if (ent.determined && !ent.userId && !ent.admin) return res.status(401).json({ error: 'Sign in to check your setup.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const brand = String(body.brand || '').trim().slice(0, 80);
  const own = String(body.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (!brand || !own) return res.status(400).json({ error: 'brand and domain are required' });

  const slug = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  const hyph = brand.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const hosts = [...new Set([
    `${slug}.com`, `${slug}.io`, `${slug}.ai`, `${slug}.app`, `${slug}.co`, `${slug}.org`, `${slug}.net`, `${slug}.store`,
    `get${slug}.com`, `try${slug}.com`, `use${slug}.com`, `${slug}app.com`, `${slug}hq.com`,
    ...(hyph !== slug ? [`${hyph}.com`, `${hyph}.co.uk`, `${hyph}.io`] : []),
  ])].filter((h) => h !== own && registrable(h) !== registrable(own));

  const collisions: { name: string; where: string; kind: 'domain' | 'repository' | 'common-words' }[] = [];
  const found = await Promise.all(hosts.map((h) => probe(h, own)));
  for (const f of found) if (f) collisions.push({ ...f, kind: 'domain' });

  // Code repositories with exactly this name (GitHub's public search; skipped quietly if rate-limited).
  try {
    const r = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(`${brand} in:name`)}&per_page=10`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'AEOAnalyzersNameCheck' }, signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const j: any = await r.json();
      for (const it of j.items || []) {
        if (String(it.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') !== slug) continue;
        if (String(it.homepage || '').toLowerCase().includes(own)) continue; // the customer's own repository
        collisions.push({ name: String(it.description || it.full_name).slice(0, 90), where: `github.com/${it.full_name}`, kind: 'repository' });
        if (collisions.filter((c) => c.kind === 'repository').length >= 3) break;
      }
    }
  } catch { /* the domain check still stands */ }

  const risk = namespaceCollisionRisk(brand);
  if (risk.risk === 'high' && !collisions.length) collisions.push({ name: risk.reasons[0] || 'common words', where: 'a name made of common words', kind: 'common-words' });

  return res.status(200).json({ collisions, checked: hosts });
}
