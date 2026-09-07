import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

/** Review gate for comparison content.
 *
 *  `/best-aeo-tools` names competitors and states facts about their products. A
 *  page like that is only defensible if every competitor claim is verified, and
 *  the page itself says so. So the two things must move together:
 *
 *    unverified markers present  =>  the page MUST be noindex
 *    the page is indexable       =>  NO unverified markers may remain
 *
 *  Shipping it indexable with `[[VERIFY]]` cells still in the table would be
 *  exactly the failure the page criticises in other vendors. This test makes
 *  that combination impossible rather than relying on someone remembering. */

const ROOT = resolve(__dirname, '../..');

/** Every committed static page that makes claims about third parties. */
function comparisonPages(): string[] {
  return execFileSync('git', ['ls-files', 'public'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f.endsWith('/index.html'))
    .filter((f) => /best-aeo-tools|comparison|vs-/.test(f));
}

const MARKER = /\[\[VERIFY/;
const NOINDEX = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i;

describe('comparison pages never ship indexable with unverified claims', () => {
  it('the D1 page exists and is committed', () => {
    expect(existsSync(resolve(ROOT, 'public/best-aeo-tools/index.html'))).toBe(true);
    expect(comparisonPages()).toContain('public/best-aeo-tools/index.html');
  });

  it('any page still carrying verification markers is noindex', () => {
    const offenders: string[] = [];
    for (const f of comparisonPages()) {
      const html = readFileSync(resolve(ROOT, f), 'utf8');
      if (MARKER.test(html) && !NOINDEX.test(html)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it('states its own vendor interest and names no winner', () => {
    const html = readFileSync(resolve(ROOT, 'public/best-aeo-tools/index.html'), 'utf8');
    // The disclosure is the thing that makes a vendor-written comparison usable.
    expect(html.toLowerCase()).toContain('we make one of these tools');
    // No self-refereed win, no superlative about ourselves.
    expect(html).not.toMatch(/\bwe are the best\b|\b#1 (aeo|tool)\b|\bbest aeo tool\b/i);
  });

  it('every number about our own measurement carries its N', () => {
    const html = readFileSync(resolve(ROOT, 'public/best-aeo-tools/index.html'), 'utf8');
    expect(html).toContain('200 recorded answers');
    expect(html).toContain('0 of 200');
  });
});
