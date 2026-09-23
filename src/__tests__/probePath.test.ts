import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isProbePath } from '../lib/probePath';

/** Every path below was ACTUALLY LOGGED against aeoanalyzers.com under an AI-crawler
 *  User-Agent between 22 July and 23 September 2026. A blocklist missed the second group
 *  on its first pass; pinning them here is what stops that recurring. */
const OBSERVED_PROBES = [
  '/.git/HEAD', '/.git/config', '/.aws/credentials', '/.aws/config', '/.git-credentials',
  '/graphql', '/actuator/configprops', '/actuator/env', '/@fs/proc/self/environ',
  // missed by the first regex:
  '/id_rsa', '/id_ed25519', '/id_ecdsa', '/id_dsa', '/_profiler/open', '/_profiler/latest',
  '/_ignition/health-check', '/aws-credentials', '/.azure/credentials', '/.gcloud/credentials',
  '/.kube/config', '/backend/.git/HEAD',
];

describe('isProbePath — a scanner wearing a crawler user-agent is not a crawl', () => {
  it('flags every probe path ever observed on our own domain', () => {
    for (const p of OBSERVED_PROBES) {
      expect(isProbePath(p), `${p} must be classified as a probe`).toBe(true);
    }
  });

  it('keeps every route the site actually serves', () => {
    const sm = readFileSync(resolve(__dirname, '../../public/sitemap.xml'), 'utf8');
    const routes = [...sm.matchAll(/<loc>https:\/\/aeoanalyzers\.com(.*?)<\/loc>/g)]
      .map(m => m[1] || '/');
    expect(routes.length).toBeGreaterThan(10);
    for (const r of [...routes, '/analyzer', '/health', '/blog/', '/pricing?ref=x']) {
      expect(isProbePath(r), `${r} is a real page and must NOT be classified as a probe`).toBe(false);
    }
  });

  it('is a pure string test — no I/O, safe inside a serverless handler', () => {
    expect(isProbePath('')).toBe(false);
    expect(isProbePath('/')).toBe(false);
  });
});
