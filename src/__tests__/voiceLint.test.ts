// Measurement-honesty voice guard — unit tests + a scan of the published blog HTML
// so superlative/absolute hype ("head and shoulders", "no other tool") can't regress.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { bannedAbsolutes } from '../lib/voiceLint';

describe('bannedAbsolutes', () => {
  it('flags unqualified superlatives / absolute brags', () => {
    expect(bannedAbsolutes('It stands head and shoulders above the rest.')).toContain('head and shoulders');
    expect(bannedAbsolutes('No other tool gives you this.')).toContain('no other tool/platform');
    expect(bannedAbsolutes('We analyze the universal signals every engine uses.')).toContain('universal signals (unknowable-algorithm claim)');
    expect(bannedAbsolutes('We guarantee results.').length).toBeGreaterThan(0);
  });
  it('allows scoped comparatives and negated guarantees', () => {
    expect(bannedAbsolutes('Most tools grade you in isolation — no competitive read.')).toEqual([]);
    expect(bannedAbsolutes('No guarantees of rankings — nobody honest can promise that.')).toEqual([]);
    expect(bannedAbsolutes('See the best payroll software for small business.')).toEqual([]); // "best" in a sample query is fine
  });
});

describe('published blog copy stays on-voice', () => {
  const blogDir = 'public/blog';
  const files: string[] = [];
  if (existsSync(blogDir)) {
    if (existsSync(join(blogDir, 'index.html'))) files.push(join(blogDir, 'index.html'));
    for (const e of readdirSync(blogDir)) {
      const p = join(blogDir, e, 'index.html');
      if (statSync(join(blogDir, e)).isDirectory() && existsSync(p)) files.push(p);
    }
  }

  it('finds at least one blog file to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s contains no banned absolutes', (f) => {
    expect(bannedAbsolutes(readFileSync(f, 'utf8'))).toEqual([]);
  });
});

/** WO-002 Lane A, the truth pass — Sep 19 2026.
 *
 *  The retired claim "other tools only give you a score" does not survive one competitor
 *  who ships rewrites, monitoring and corrections, and Lilypath does. It had reached
 *  twelve surfaces because voiceLint's own doctrine PERMITTED it: "SCOPED comparatives
 *  are fine." A guard that allows the thing is why the thing spreads.
 *
 *  These assertions carry the real strings, so a future edit that reintroduces any of
 *  them goes red rather than shipping. */
describe('comparative-deficiency claims about competitors are banned', () => {
  const REAL_LINES_THAT_SHIPPED = [
    'Most AEO tools hand you a score and walk away.',
    'Most tools hand you a score and stop — and some report a scary claim.',
    'Other tools hand you a number and stop.',
    'Most “AEO” or “GEO” tools hand you a score and stop.',
    'Most tools: score one engine, or infer from a crawl.',
    'Most tools: grade you in isolation — no competitive read.',
    'Most tools: tell you “you’re losing” and stop.',
    'Most tools: never look at the front door.',
    'Most tools: check only whether you’re mentioned, never whether it’s right.',
    'Most tools & consultants: a one-time PDF you have to take on faith.',
    // MISSED BY THE FIRST PASS. The pattern allowed only "aeo"/"geo" between the
    // subject and the noun, so an ordinary modifier walked straight through it while
    // the truth pass reported twelve surfaces cleared. It had been the LEAD SENTENCE
    // of /blog/how-it-works the whole time.
    'Most AI-visibility tools hand you a number and a vibe.',
    'Other AI search platforms give you a score and nothing else.',
  ];

  it('fires on every line that actually shipped', () => {
    for (const line of REAL_LINES_THAT_SHIPPED) {
      expect(bannedAbsolutes(line), `should have been caught: ${line}`).not.toEqual([]);
    }
  });

  /** Precision matters more than recall here. A scan at 6 true hits in 19 is an audit
   *  tool; a gate at that rate gets switched off inside a week, and then it is worse
   *  than not having one. These are the real false positives the loose scan produced. */
  it('does not fire on statements about the reader or about us', () => {
    for (const line of [
      'You walk away with a plain-English scorecard and the stored transcripts.',
      'A Citation Sweep does not end at a score. It ends at an action plan.',
      'In practice the terms are used interchangeably by most vendors.',
      'We report three separable layers rather than one blended number.',
      'A score on its own is a number to look at. We hand you the fixes too.',
      'Most tools in this category are priced per seat.',
    ]) {
      expect(bannedAbsolutes(line), `false positive on: ${line}`).toEqual([]);
    }
  });

  it('still catches the absolutes it always did', () => {
    expect(bannedAbsolutes('we are head and shoulders above')).not.toEqual([]);
    expect(bannedAbsolutes('no other tool measures this')).not.toEqual([]);
  });
});

/** The claims the guardrail retired for cause must stay out of every SERVED surface,
 *  not just out of the page they were first found on. Crawler telemetry for a customer
 *  domain is undeliverable and was removed from pricing and landing on Sep 7 — it then
 *  survived in the User Guide for twelve days. */
describe('retired product claims stay off every served surface', () => {
  const { readFileSync, readdirSync, statSync } = require('node:fs') as typeof import('node:fs');
  const { resolve, join } = require('node:path') as typeof import('node:path');
  const ROOT = resolve(__dirname, '..', '..');

  const walk = (d: string, out: string[] = []): string[] => {
    for (const n of readdirSync(d)) {
      if (['node_modules', 'dist', '.git', 'docs', 'private'].includes(n) || n.startsWith('.')) continue;
      const f = join(d, n);
      if (statSync(f).isDirectory()) walk(f, out);
      else if (/\.(tsx?|html)$/.test(f) && !/__tests__|\.test\./.test(f)) out.push(f);
    }
    return out;
  };

  it('promises no AI-crawler telemetry for a customer domain', () => {
    const offenders: string[] = [];
    for (const f of walk(ROOT)) {
      const src = readFileSync(f, 'utf8');
      // The claim, not the word: botClassify.ts legitimately documents the registry, and
      // the two Sep-7 removal comments legitimately name what was removed.
      for (const line of src.split('\n')) {
        if (/\bAI[-\s]crawler telemetry\b/i.test(line)
          && !/^\s*(\/\/|\*|\{\s*\/\*)/.test(line)
          && !/Removed|dropped|WO-3/i.test(line)) offenders.push(`${f.replace(ROOT, '')}: ${line.trim().slice(0, 90)}`);
      }
    }
    expect(offenders, `retired telemetry promise still live:\n${offenders.join('\n')}`).toEqual([]);
  });
});

/** THE GUARD READ ONLY HALF THE COPY — found Sep 19 2026 by breaking it.
 *
 *  voiceLint scanned `public/blog` and nothing else. Four of the twelve motif instances
 *  lived in React components — the hero window, two FAQs and a comparison card — which
 *  is the most-read copy on the site and the copy the guard never opened. Restoring the
 *  banned hero line left the suite green, which is how it reached production in the
 *  first place.
 *
 *  Marketing copy lives in components as well as in HTML. The lint follows the copy. */
describe('marketing copy in components stays on-voice too', () => {
  const { readFileSync, existsSync } = require('node:fs') as typeof import('node:fs');
  const { resolve } = require('node:path') as typeof import('node:path');
  const ROOT = resolve(__dirname, '..', '..');

  // The components that carry customer-facing prose. Adding a marketing surface means
  // adding it here; the list is short and explicit so a new one is a deliberate act.
  const COPY_SURFACES = [
    'src/components/MarketingLanding.tsx',
    'src/components/PersonasAndFAQ.tsx',
    'src/components/UserGuide.tsx',
    'src/components/UserGuideDashboard.tsx',
    'src/components/Payments.tsx',
    'src/components/PressKit.tsx',
    'src/components/ScoreVsSweepCard.tsx',
  ];

  it('every listed surface exists, so a rename cannot silently drop one', () => {
    for (const f of COPY_SURFACES) {
      expect(existsSync(resolve(ROOT, f)), `${f} is listed but missing`).toBe(true);
    }
  });

  for (const f of COPY_SURFACES) {
    it(`${f} carries no banned absolute or comparative-deficiency claim`, () => {
      const src = readFileSync(resolve(ROOT, f), 'utf8');
      // Comment lines are excluded: the retired claims are deliberately quoted in
      // comments that record why they were removed, and that record must survive.
      const prose = src.split('\n')
        .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
        .join('\n');
      expect(bannedAbsolutes(prose), `${f} regressed`).toEqual([]);
    });
  }
});

/** EFFICACY SUPERLATIVES — added Sep 20 2026 after the User Guide was found claiming
 *  schema is "the single most effective way to improve your AEO score". Two problems in
 *  one sentence: an unqualified superlative, and a claim our own published primer
 *  contradicts — six of seven platforms cannot read schema, and a fact placed only there
 *  was answered by none of them.
 *
 *  The BANNED list had eleven entries and not one covered a claim about how WELL
 *  something works, which is the most consequential kind to get wrong. */
describe('claims about how well something works are not exempt from the voice rule', () => {
  it('catches the sentence that shipped', () => {
    expect(bannedAbsolutes('This is the single most effective way to improve your AEO score.')).not.toEqual([]);
  });

  it('catches the family, not just that phrasing', () => {
    for (const s of [
      'the most important thing you can do for AI visibility',
      'the most powerful lever available',
      'the fastest way to get cited',
      'the surest way to be recommended',
    ]) expect(bannedAbsolutes(s), `missed: ${s}`).not.toEqual([]);
  });

  it('does not fire on ordinary comparative prose', () => {
    for (const s of [
      'We report three separable layers rather than one blended number.',
      'Index presence matters more than page structure when you are failing gate one.',
      'This is effective for entity disambiguation.',
    ]) expect(bannedAbsolutes(s), `false positive: ${s}`).toEqual([]);
  });
});
