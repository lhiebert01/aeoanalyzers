// WO-QA-003 E3 — llms.txt generator + spec validator + drift-diff.

import { describe, it, expect } from 'vitest';
import { renderLlmsTxt, renderLlmsFullTxt, validateLlmsTxt, diffLlmsTxt, extractLlmsDoc } from '../lib/llmsTxt';

const doc = {
  title: 'AEO Analyzers',
  summary: 'Scores how citable your site is by AI answer engines and gives the exact fixes.',
  sections: [{ heading: 'Pages', links: [
    { name: 'Home', url: 'https://aeoanalyzers.com/' },
    { name: 'Blog', url: 'https://aeoanalyzers.com/blog/', context: 'Field notes on answer-engine visibility' },
  ] }],
};

describe('renderLlmsTxt + validateLlmsTxt', () => {
  it('renders a spec-compliant file that validates', () => {
    const txt = renderLlmsTxt(doc);
    expect(txt).toMatch(/^# AEO Analyzers\n/);
    expect(txt).toContain('> Scores how citable');
    expect(txt).toContain('## Pages');
    expect(txt).toContain('- [Blog](https://aeoanalyzers.com/blog/): Field notes');
    expect(validateLlmsTxt(txt).valid).toBe(true);
  });

  it('flags a malformed file', () => {
    const v = validateLlmsTxt('Just some text with no structure.');
    expect(v.valid).toBe(false);
    expect(v.issues.join(' ')).toMatch(/H1/);
  });
});

describe('renderLlmsFullTxt', () => {
  it('concatenates priority-page text with sources', () => {
    const full = renderLlmsFullTxt('AEO Analyzers', [{ title: 'Home', url: 'https://aeoanalyzers.com/', text: 'Be the answer AI gives.' }]);
    expect(full).toContain('## Home');
    expect(full).toContain('Source: https://aeoanalyzers.com/');
    expect(full).toContain('Be the answer AI gives.');
  });
});

describe('diffLlmsTxt (drift vs the live-served file)', () => {
  it('reports links to add and treats a missing live file as all-new', () => {
    const generated = renderLlmsTxt(doc);
    expect(diffLlmsTxt(generated, null).urlsOnlyInGenerated.length).toBeGreaterThan(0);
    expect(diffLlmsTxt(generated, generated).identical).toBe(true);
  });

  it('detects a link present live but missing from the generated file', () => {
    const generated = renderLlmsTxt(doc);
    const live = generated + '\n- [Pricing](https://aeoanalyzers.com/pricing)\n';
    const d = diffLlmsTxt(generated, live);
    expect(d.identical).toBe(false);
    expect(d.urlsOnlyInLive).toContain('https://aeoanalyzers.com/pricing');
  });
});

describe('extractLlmsDoc', () => {
  it('pulls title, summary, and internal links from homepage HTML', () => {
    const html = `<html><head>
      <meta property="og:site_name" content="AEO Analyzers">
      <meta name="description" content="Scores site citability for AI answer engines.">
      </head><body>
      <a href="/blog/">Blog</a><a href="/pricing">Pricing</a>
      <a href="https://twitter.com/x">Twitter</a></body></html>`;
    const d = extractLlmsDoc(html, 'aeoanalyzers.com');
    expect(d.title).toBe('AEO Analyzers');
    expect(d.summary).toMatch(/citability/);
    expect(extractLlmsDoc('<head><meta name="description" content="A &amp; B tools"></head><body><a href="/x">x</a></body>', 'aeoanalyzers.com').summary).toBe('A & B tools'); // entities decoded
    const urls = d.sections[0].links.map((l) => l.url);
    expect(urls).toContain('https://aeoanalyzers.com/blog/');
    expect(urls.some((u) => u.includes('twitter.com'))).toBe(false); // internal only
    expect(validateLlmsTxt(renderLlmsTxt(d)).valid).toBe(true);
  });
});

/** Founder ruling, Sep 18 2026: "just relabel this, not remove — it is of value to show
 *  it but it does not impact sweeps." WO-003 Lane E: llms.txt drops to an optional item
 *  marked No evidence, with the study numbers printed inline, and the generator stays. */
describe('llms.txt is labelled as unproven rather than presented as a fix', () => {
  const read = (rel: string) => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { resolve } = require('node:path') as typeof import('node:path');
    return readFileSync(resolve(__dirname, '..', rel), 'utf8');
  };

  it('says "no evidence this affects citations" in the recommendation itself', () => {
    expect(read('lib/crawlerAccess.ts')).toContain('no evidence this affects citations');
  });

  it('prints the study numbers inline rather than asserting a verdict', () => {
    const src = read('lib/crawlerAccess.ts');
    expect(src).toContain('97%');
    expect(src).toContain('137,000');
    expect(src).toContain('300,000');
  });

  it('never calls it required, a priority, or a fix', () => {
    const src = read('lib/crawlerAccess.ts');
    const line = src.slice(src.indexOf('no evidence this affects citations') - 400, src.indexOf('Indexing, visible body text'));
    expect(line).not.toMatch(/\brequired\b/i);
    expect(line).toContain('it is not a fix');
  });

  it('the roadmap carries the same label, so the two surfaces agree', () => {
    expect(read('components/ImplementationRoadmap.tsx')).toContain('no evidence this affects citations');
  });

  it('the generator is NOT removed — relabel, not delete', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { resolve } = require('node:path') as typeof import('node:path');
    expect(() => readFileSync(resolve(__dirname, '../lib/llmsTxt.ts'), 'utf8')).not.toThrow();
  });
});
