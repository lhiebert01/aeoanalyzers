import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { lintText, htmlText, type AllowEntry } from '../lib/engineLint';

/** WO-AEO-ENGINE-COUNT-CURRENCY-008 §6 — L-ENGINE-1, proved by breaking it. */
const allow: AllowEntry[] = JSON.parse(readFileSync('docs/engine-count-allowlist.json', 'utf8')).entries;
const engines = JSON.parse(readFileSync('src/data/engines.json', 'utf8'));
const bad = (file: string, text: string) => lintText(file, text, allow).filter((h) => !h.ok);

describe('L-ENGINE-1', () => {
  it('fails the old "We measure four" line', () => {
    expect(bad('x.html', 'We measure four: ChatGPT, Claude, Gemini and Perplexity.')).toHaveLength(1);
  });
  it('fails a bare "five answer engines"', () => {
    expect(bad('x.html', 'AEO Analyzers asks five answer engines.')).toHaveLength(1);
  });
  it('fails four-first wording even when both plans are named', () => {
    expect(bad('x.html', 'Sweeps ask four engines on the Day Pass and five engines on Pro and Business.')).toHaveLength(1);
  });
  it('passes the canonical sentence and the short form', () => {
    expect(bad('x.html', engines.canonical)).toEqual([]);
    expect(bad('x.html', `Citation Sweeps: ${engines.short}.`)).toEqual([]);
  });
  it('the live why-ai-doesnt-mention-you page passes, and fails when the old line is put back', () => {
    const html = readFileSync('public/blog/why-ai-doesnt-mention-you/index.html', 'utf8');
    expect(bad('public/blog/why-ai-doesnt-mention-you/index.html', htmlText(html))).toEqual([]);
    expect(html).not.toContain('Copilot, Grok, Meta AI');
    const broken = html.replace('<p>For the engines we do measure:', '<p>We measure four: ChatGPT, Claude, Gemini and Perplexity. AEO Analyzers asks five answer engines. For the engines we do measure:');
    expect(bad('public/blog/why-ai-doesnt-mention-you/index.html', htmlText(broken)).length).toBe(2);
  });
  it('the whole published surface passes (the build gate)', () => {
    expect(() => execSync('npx tsx scripts/lint-engine-count.ts', { stdio: 'pipe' })).not.toThrow();
  });
});
