// WO-AEO-EXECREPORT-001 (minimal generator) — deterministic report assembly,
// rendering, gray-hat backstop, and the DRAFT outreach email.

import { describe, it, expect } from 'vitest';
import {
  assembleReportData, defaultNarrative, renderExecReport, buildOutreachEmail,
  containsGrayHat, buildNarrativePrompt,
} from '../lib/execReport';
import type { SweepRunResult } from '../lib/citationSweep';
import type { TruthRecord } from '../lib/truthRecord';

const run = (over: Partial<SweepRunResult>): SweepRunResult => ({
  engine: 'claude', query: 'q', queryType: 'category', runIndex: 0,
  transcript: '', sources: [], costUsd: 0.01, grounding: 'search-grounded', ...over,
});

const truth: TruthRecord = { brandName: 'AEO Analyzers', founders: ['Lindsay Hiebert'], sameAs: [], facts: [] };

const runs: SweepRunResult[] = [
  run({ queryType: 'branded', transcript: 'AEO Analyzers, founded by Lindsay Hiebert.' }),           // cited-accurate
  run({ queryType: 'branded', transcript: 'AEO Analyzers was co-founded by Jesper Nissen.',          // drifted + entity collision
        sources: ['https://en.wikipedia.org/wiki/AEA'] }),
  run({ queryType: 'category', transcript: 'Try Profound (tryprofound.com) for tracking.' }),        // competitor, brand not cited
  run({ queryType: 'category', transcript: 'Profound (tryprofound.com) is the enterprise pick.' }),  // competitor
];

const data = assembleReportData({ brand: 'AEO Analyzers', domain: 'aeoanalyzers.com', sweepDate: '2026-07-31', runs, competitors: [], truth });

describe('assembleReportData', () => {
  it('computes the headline facts from the scored runs (numbers, never invented)', () => {
    expect(data.headline.brandedPct).toBe(100);          // 2/2 branded cited
    expect(data.headline.categoryWinPct).toBe(0);        // 0/2 category cited
    expect(data.headline.topCompetitor?.name).toBe('Profound');
    expect(data.headline.entityCollisions.join(' ')).toMatch(/aea/i);
    expect(data.headline.driftedCount).toBe(1);          // Jesper Nissen fabrication
  });
});

describe('containsGrayHat backstop', () => {
  it('rejects drafts that recommend parasite / gray-hat tactics', () => {
    expect(containsGrayHat('You should try parasite SEO to rank faster.').ok).toBe(false);
    expect(containsGrayHat('Consider Perplexity-Pages seeding on a high-authority site.').ok).toBe(false);
    expect(containsGrayHat('Host content on a high-authority platform to borrow its ranking.').ok).toBe(false);
  });
  it('passes clean, first-party advice', () => {
    const clean = defaultNarrative(data).recommendations.join(' ');
    expect(containsGrayHat(clean).ok).toBe(true);
  });
});

describe('renderExecReport', () => {
  const nar = defaultNarrative(data);
  it('watermarks the COURTESY variant and not the PAID one', () => {
    expect(renderExecReport(data, nar, 'courtesy')).toContain('SAMPLE — Courtesy Assessment');
    expect(renderExecReport(data, nar, 'paid')).not.toContain('SAMPLE — Courtesy Assessment');
  });
  it('injects computed numbers with N + confidence', () => {
    const paid = renderExecReport(data, nar, 'paid');
    expect(paid).toContain('100% (N=2');   // branded retrievability + N
    expect(paid).toMatch(/Profound · 2×/);  // cited-instead table
    expect(paid).toContain('Engines are confusing you with');
  });
});

describe('buildNarrativePrompt', () => {
  it('feeds the model the numbers and forbids inventing statistics', () => {
    const p = buildNarrativePrompt(data);
    expect(p).toContain('do NOT invent');
    expect(p).toContain('100%');            // the numbers are provided as read-only facts
    expect(p).toMatch(/NEVER recommend parasite SEO/i);
  });
});

describe('buildOutreachEmail (DRAFT only)', () => {
  const nar = defaultNarrative(data);
  const email = buildOutreachEmail(data, nar, {
    postalAddress: 'PIGENAI LLC · 5901 NW 63rd Ter, Apt 301 · Kansas City, MO 64151',
    optOut: 'Prefer not to hear from me? Reply "no thanks" and I won\'t write again.',
    senderName: 'Lindsay Hiebert',
  });
  it('uses the narrative subject and carries the CAN-SPAM footer', () => {
    expect(email.subject).toBe(nar.subject);
    expect(email.body).toContain('5901 NW 63rd Ter, Apt 301');   // required postal address
    expect(email.body).toContain('Kansas City, MO 64151');
    expect(email.body).toMatch(/no thanks/i);                    // opt-out line present
  });
  it('states only measured numbers in the body', () => {
    expect(email.body).toContain('100%');   // branded
    expect(email.body).toContain('0%');     // category win
  });
});
