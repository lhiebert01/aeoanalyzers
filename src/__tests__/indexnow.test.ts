import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error — plain ESM script, imported for its pure helper
import { KEY, HOST, urlsFromSitemap } from '../../scripts/indexnow-ping.mjs';

const root = (p: string) => resolve(__dirname, '..', '..', p);
const sitemap = readFileSync(root('public/sitemap.xml'), 'utf8');

describe('IndexNow — the key file and the URL set are both real', () => {
  it('serves the key at /<key>.txt and the file contains exactly the key', () => {
    expect(KEY).toMatch(/^[0-9a-f]{32}$/);
    const f = root(`public/${KEY}.txt`);
    expect(existsSync(f), `${f} missing — IndexNow will reject every ping`).toBe(true);
    expect(readFileSync(f, 'utf8').trim()).toBe(KEY);
  });

  it('submits only sitemap URLs on this host — nothing can be invented', () => {
    const all = urlsFromSitemap(sitemap, { all: true });
    expect(all.length).toBeGreaterThan(10);
    for (const u of all) expect(u.startsWith(`https://${HOST}/`)).toBe(true);
  });

  it('the recency filter actually filters', () => {
    const recent = urlsFromSitemap(sitemap, { days: 2, now: new Date('2026-09-23T12:00:00Z') });
    const stale  = urlsFromSitemap(sitemap, { days: 2, now: new Date('2027-01-01T00:00:00Z') });
    expect(recent.length).toBeGreaterThan(0);
    expect(stale.length).toBe(0);
    expect(recent).toContain(`https://${HOST}/evidence`);
  });
});
