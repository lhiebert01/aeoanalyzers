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
