import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** This repository is PUBLIC. Prospect identities — names, email addresses,
 *  verification status, roster history — must never appear in a tracked file.
 *  They live only in the gitignored `private/` slate.
 *
 *  On Sep 7 2026 an audit found 16 prospect addresses had been sitting in a
 *  tracked GTM document since Aug 5 2026. The tree was redacted; this test is
 *  what stops it recurring. It walks the files git actually tracks, so a file
 *  under `private/` is out of scope by construction.
 *
 *  The check counts what is in the tracked tree — the outcome — rather than
 *  trusting that an author remembered the rule. */

const ownDomains = [
  'aeoanalyzers.com', 'lanternpost.app', 'thesmartaiworker.com', 'pigenai.com',
  'sanctumshield.com', 'gmail.com', 'example.com', 'sentry.io', 'supabase.co',
];

/** Address-shaped strings that are not ours. Deliberately broad: a false
 *  positive costs one allowlist entry, a false negative publishes someone's
 *  contact details. */
const EMAIL_RX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter((f) => /\.(md|txt|json|ts|tsx|mjs|html|yml|yaml|csv)$/.test(f));
}

/** Read the working-tree copy of a tracked file: the guard must catch a leak
 *  that is staged but not yet committed, which is when it is still cheap. */
function readTracked(file: string): string {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

describe('public repo carries no prospect data', () => {
  it('no tracked file contains a third-party email address', () => {
    const offenders: string[] = [];
    for (const file of trackedFiles()) {
      const text = readTracked(file);
      for (const addr of text.match(EMAIL_RX) || []) {
        const domain = addr.split('@')[1].toLowerCase();
        // Ours, or an obvious placeholder/example in template copy.
        if (ownDomains.some((d) => domain === d || domain.endsWith(`.${d}`))) continue;
        if (/^(you|your|name|domain|company|brand|prospect|user|test|localhost)\b/i.test(domain)) continue;
        // Obvious placeholder local-parts used in fixtures and template copy.
        if (/^(you|your|me|name|first|email|someone|user|test|example)@/i.test(addr)) continue;
        offenders.push(`${file}: ${addr}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the redacted GTM section stays redacted', () => {
    const doc = readTracked('docs/GTM90-STATUS-AND-PLAN-2026-08-05.md');
    expect(doc).toContain('[REDACTED Sep 7 2026');
    // The slate is the only home for per-row target detail.
    expect(doc).toContain('private/GTM90-Master-Target-Slate-v4.2.xlsx');
  });

  it('the tracked outreach copy kit uses placeholders, never real targets', () => {
    const kit = readTracked('docs/outreach/AEO-OUTREACH-COPY-KIT.md');
    expect(kit.length).toBeGreaterThan(1000);
    expect(kit).toContain('[FIRST NAME]');
    expect(kit).toContain('[DOMAIN]');
    expect(kit).toContain('[SWEEP FINDING]');
    // The CAN-SPAM footer is required copy and must survive edits.
    expect(kit).toContain('5901 NW 63rd Ter, Suite 301');
  });
});
