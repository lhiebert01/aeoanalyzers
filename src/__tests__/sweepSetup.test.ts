import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  brandedQuestions, weakBrandedQuestion, unsupportedWords, removeWord, isProcedureQuestion, rephraseProcedure,
  siteDigest, isUsedSource, setupCheck, QUESTIONS_PROMPT, EXTRACT_PROMPT, COMPETITORS_PROMPT,
} from '../lib/sweepSetup';

/** Nov 22 2026 (usesignalatlas.com): build the setup from what makes the site different and check
 *  it in plain English before a customer pays for a sweep with the wrong questions. */
const SITE = `<html><head><title>Signal Atlas — The research desk where every number has a receipt</title>
<meta name="description" content="Signal Atlas puts 26 authoritative sources in one research desk."></head><body>
<h2>Live earthquake feed</h2><p>M 4.9 · 170 km WNW of Port-Olry</p>
<h2>The official sources Signal Atlas connects to</h2><p>World Bank Open Data, FRED Economic Data, arXiv.</p>
<a href="https://data.worldbank.org">World Bank Open Data</a><a href="https://fred.stlouisfed.org">FRED Economic Data</a>
<a href="https://www.wolframalpha.com">Wolfram|Alpha</a><a href="https://ourworldindata.org">Open Source</a><p>Our World in Data ourworldindata.org Guided</p>
<a href="https://pigenai.com">PIGENAI</a><a href="https://www.linkedin.com/company/x">LinkedIn</a>
<h2>Built for people whose numbers get checked</h2><p>Analysts, journalists and media desks, research writers, policy and academic researchers.</p>
<h2>What makes it different</h2><p>Verified before you see it. A receipt with every number.</p>
</body></html>`;

describe('sweep setup: questions about the company', () => {
  it('names the brand with the domain in brackets, never "who is example.com"', () => {
    expect(brandedQuestions('Signal Atlas', 'usesignalatlas.com')).toEqual(['What is Signal Atlas (usesignalatlas.com)?', 'Who makes Signal Atlas (usesignalatlas.com)?']);
    for (const q of brandedQuestions('Signal Atlas', 'usesignalatlas.com')) expect(weakBrandedQuestion(q, 'Signal Atlas', 'usesignalatlas.com')).toBeNull();
    expect(weakBrandedQuestion('who is usesignalatlas.com', 'Signal Atlas', 'usesignalatlas.com')).toMatch(/website/);
    expect(weakBrandedQuestion('what is usesignalatlas.com', 'Signal Atlas', 'usesignalatlas.com')).toMatch(/without the brand name/);
  });
});

describe('sweep setup: words the site must say first', () => {
  it('flags budget and audience words the site never uses, and keeps them when it does', () => {
    expect(unsupportedWords('affordable AI tool for startups to combine notes', 'A research desk for analysts').map((u) => u.word)).toEqual(['affordable', 'startups']);
    expect(unsupportedWords('research desk for agencies', 'Built for agencies and analysts')).toEqual([]);
    expect(unsupportedWords('best research desk for analysts', 'Built for analysts')).toEqual([]);
  });
  it('takes the word and the phrase it hangs on out, in plain words', () => {
    expect(removeWord('affordable alternative to Dovetail for research', 'affordable')).toBe('alternative to Dovetail for research');
    expect(removeWord('best AI software to synthesize notes for small teams', 'small teams')).toBe('best AI software to synthesize notes');
    expect(removeWord('an affordable source checker', 'affordable')).toBe('a source checker');
  });
  it('marks "how to" questions as procedure questions and offers a recommendation question', () => {
    expect(isProcedureQuestion('how to find the official source for an economic statistic')).toBe(true);
    expect(isProcedureQuestion('How do I check a number from an AI answer?')).toBe(true);
    expect(isProcedureQuestion('best tool to find the official source for a statistic')).toBe(false);
    expect(rephraseProcedure('how to find the official source for an economic statistic')).toBe('best tool to find the official source for an economic statistic');
  });
});

describe('sweep setup: what the site says about itself', () => {
  const d = siteDigest([{ url: 'https://usesignalatlas.com/', html: SITE }], 'usesignalatlas.com', ['pigenai.com']);
  it('puts who it serves and what makes it different ahead of everything else', () => {
    const heads = d.digest.split('\n').filter((l) => l.startsWith('## '));
    expect(heads.indexOf('## Built for people whose numbers get checked')).toBeLessThan(heads.indexOf('## Live earthquake feed'));
    expect(heads.indexOf('## What makes it different')).toBeLessThan(heads.indexOf('## Live earthquake feed'));
  });
  it('lists the sources the site links to, never its parent company or social profiles', () => {
    expect(d.usedSources).toContain('World Bank Open Data');
    expect(d.usedSources).toContain('Wolfram|Alpha');
    expect(d.usedSources.some((s) => /Our World in Data/.test(s))).toBe(true);
    expect(d.usedSources.join(' ')).not.toMatch(/pigenai|linkedin/i);
  });
  it('never suggests a source the product uses as a competitor', () => {
    expect(isUsedSource('Wolfram Alpha', d.usedSources)).toBe(true);
    expect(isUsedSource('Our World in Data', d.usedSources)).toBe(true);
    for (const c of ['Perplexity', 'Statista', 'Consensus']) expect(isUsedSource(c, d.usedSources)).toBe(false);
  });
});

describe('sweep setup: the free setup check', () => {
  const d = siteDigest([{ url: 'https://usesignalatlas.com/', html: SITE }], 'usesignalatlas.com', ['pigenai.com']);
  const base = { brand: 'Signal Atlas', domain: 'usesignalatlas.com', category: 'research desk for official data with cited sources', siteText: d.text, usedSources: d.usedSources };
  it('flags the Nov 22 setup in plain English, each with a fix', () => {
    const issues = setupCheck({ ...base, competitors: ['Wolfram Alpha', 'Perplexity'], brandedQuestions: ['who is usesignalatlas.com', 'what is usesignalatlas.com'],
      buyerQuestions: ['affordable AI tool for startups to check sources', 'how to verify claims made by ChatGPT with source links'],
      collisions: [{ name: 'Signal Atlas — Digital MAC address packs', where: 'signalatlas.store', kind: 'domain' }] });
    const ids = issues.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['collision', 'branded', 'word-0', 'procedure-1', 'source-Wolfram Alpha']));
    for (const i of issues) expect(`${i.title} ${i.detail}`).not.toMatch(/[{}]|undefined|null/);
    expect(issues.find((i) => i.id === 'branded')!.fix).toEqual({ kind: 'replaceBranded', questions: brandedQuestions('Signal Atlas', 'usesignalatlas.com') });
    const coll = issues.find((i) => i.id === 'collision')!.detail;
    expect(coll).toMatch(/signalatlas\.store.*official profiles.*Wikidata/s);
    expect(coll).not.toMatch(/[a-z][A-Z]|sameAs|JSON|schema/); // plain English, no property names
  });
  it('a setup built from the site passes clean', () => {
    const issues = setupCheck({ ...base, competitors: ['Perplexity', 'Statista', 'Consensus'], brandedQuestions: brandedQuestions('Signal Atlas', 'usesignalatlas.com'),
      buyerQuestions: ['best research tool that links every statistic to its official source', 'alternatives to Statista that use official public data'] });
    expect(issues).toEqual([]);
  });
});

describe('sweep setup: the prompts and the editor', () => {
  it('the question prompt forbids budget words, audiences and "how to", and carries what makes the site different', () => {
    const p = QUESTIONS_PROMPT({ category: 'research desk', differentiators: ['a receipt with every number'], audiences: [], competitors: ['Statista'], sources: ['FRED Economic Data'] });
    expect(p).toMatch(/Never use budget words/);
    expect(p).toMatch(/Do not write "how to/);
    expect(p).toContain('a receipt with every number');
    expect(EXTRACT_PROMPT('x')).toMatch(/never the site's tagline or slogan/);
    const c = COMPETITORS_PROMPT({ category: 'AI research assistant for official statistics', needs: ['find official economic statistics with a source link'], sources: ['FRED Economic Data', 'Wolfram|Alpha'] });
    expect(c).toMatch(/Do not list these, which are data sources rather than competing products: FRED Economic Data, Wolfram\|Alpha/);
    expect(c).toContain('Which tool should I use to find official economic statistics with a source link?');
    expect(QUESTIONS_PROMPT({ category: 'x', needs: ['find official data'], differentiators: [], audiences: [], competitors: [], sources: [] })).toMatch(/Do not quote the site's marketing phrases/);
  });
  it('the question editor shows no code notation and uses plain names', () => {
    const src = readFileSync('src/components/SweepDashboard.tsx', 'utf8');
    expect(src).not.toMatch(/\{'\{domain\}'\}/);
    expect(src).not.toMatch(/'who is \{domain\}/);
    expect(src).toContain('Questions about your company');
    expect(src).toContain('Questions your buyers ask');
    expect(src).toMatch(/question\{sweepSize\.questions !== 1 \? 's' : ''\}, \{sweepSize\.answers\} answers/);
  });
});
