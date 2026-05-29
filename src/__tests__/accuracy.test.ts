// Regression suite for the Part-4 accuracy fixes in AEOANALYZERS_IMPROVEMENT_BRIEF.md.
//
// These target the DETERMINISTIC logic (the classifier, the offer filter, the gap
// classifier, the query filter, and the post-processing guard). The Gemini calls
// themselves are non-deterministic and not unit-tested here; the guard layer is
// what actually enforces the rules regardless of model output, so that is what we
// pin down.

import { describe, it, expect } from 'vitest';
import { classifySiteType, voiceRulesFor } from '../lib/brandType';
import { filterOffers, isArchitectureTerm, filterOfferCatalogObject, MAX_SERVICES } from '../lib/offerCatalog';
import {
  classifyGap,
  recommendationFor,
  filterCandidateQueries,
  isUniversallyUsefulQuestion,
} from '../lib/queryGap';
import { applyAccuracyGuards, safeJsonParse, type AnalysisResult } from '../services/geminiService';
import {
  MACROLENS_EDITORIAL_HTML,
  SAAS_HTML,
  ECOMMERCE_HTML,
  MACROLENS_SEVEN_OFFERS,
} from './fixtures';

// --- Test 1: Editorial brand voice preservation ----------------------------
describe('Test 1: editorial brand voice preservation', () => {
  it('classifies the Macro Lens homepage as editorial', () => {
    const result = classifySiteType(MACROLENS_EDITORIAL_HTML);
    expect(result.type).toBe('editorial');
  });

  it('editorial voice rules suppress the adjective-to-metric rewriter', () => {
    const rules = voiceRulesFor('editorial');
    expect(rules.skipAdjectiveToMetric).toBe(true);
    expect(rules.preserveVoice).toBe(true);
    expect(rules.taglineRecommendationsAllowed).toBe(false);
    expect(rules.schemaFocus).toBe(true);
  });

  it('the guard strips voice rewrites for editorial sites even if the model returned them', () => {
    const brand = classifySiteType(MACROLENS_EDITORIAL_HTML);
    const result: AnalysisResult = {
      score: 88, summary: '', criteria: [], recommendations: [], citationProbability: 80,
      // The model wrongly proposed a SaaS-register rewrite of the hero copy:
      contentRewrites: [{
        current: 'Anxiety-free investing for the rest of us',
        proposed: 'Data-driven market oversight utilizing an early warning system...',
        page: 'hero',
      }],
      schemaDensityRecommendations: [{ schemaType: 'NewsArticle', reason: 'dated briefs', benefit: 'article citations' }],
    };
    const guarded = applyAccuracyGuards(result, brand);
    expect(guarded.contentRewrites).toEqual([]); // voice rewrites removed
    expect(guarded.siteType).toBe('editorial');
    expect(guarded.schemaDensityRecommendations!.length).toBeGreaterThan(0); // schema path retained
  });

  it('still classifies SaaS / ecommerce correctly (no over-fitting to editorial)', () => {
    expect(classifySiteType(SAAS_HTML).type).toBe('saas');
    expect(classifySiteType(ECOMMERCE_HTML).type).toBe('ecommerce');
  });

  it('does NOT strip voice rewrites for a SaaS site', () => {
    const brand = classifySiteType(SAAS_HTML);
    const result: AnalysisResult = {
      score: 70, summary: '', criteria: [], recommendations: [], citationProbability: 60,
      contentRewrites: [{ current: 'best-in-class', proposed: 'handles 10k issues/sec', page: 'hero' }],
    };
    const guarded = applyAccuracyGuards(result, brand);
    expect(guarded.contentRewrites!.length).toBe(1);
  });
});

// --- Test 2: Inferred-value isolation --------------------------------------
describe('Test 2: inferred values never ship in the safe-to-paste block', () => {
  it('comprehensiveSchema (the paste target) points at verifiedSchema, never the candidate block', () => {
    const brand = classifySiteType(MACROLENS_EDITORIAL_HTML);
    const verified = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Organization', name: 'Macro Lens',
    });
    // The inferred block contains the hallucinated "Mixed, Watch, or Action" regime
    // labels that do NOT appear on the page.
    const candidate = JSON.stringify({
      '@type': 'Service',
      name: 'Deterministic Six-Signal Market Read',
      description: 'produces a status (Mixed, Watch, or Action).',
      _meta: { provenance: 'inferred' },
    });
    const result: AnalysisResult = {
      score: 88, summary: '', criteria: [], recommendations: [], citationProbability: 80,
      verifiedSchema: verified, candidateSchema: candidate,
    };
    const guarded = applyAccuracyGuards(result, brand);
    expect(guarded.comprehensiveSchema).toBe(guarded.verifiedSchema);
    expect(guarded.comprehensiveSchema).not.toContain('Mixed, Watch, or Action');
    // The inferred value is preserved, but only in the clearly-flagged candidate block.
    expect(guarded.candidateSchema).toContain('Mixed, Watch, or Action');
  });
});

// --- Test 3: OfferCatalog cap ----------------------------------------------
describe('Test 3: OfferCatalog cap and architecture filtering', () => {
  it('flags internal architecture terms', () => {
    expect(isArchitectureTerm('AI Synthesis Layer')).toBe(true);
    expect(isArchitectureTerm('Sector Rotation Framework')).toBe(true);
    expect(isArchitectureTerm('Deterministic Six-Signal Market Read')).toBe(false); // no arch keyword, real-looking
    expect(isArchitectureTerm('Daily Market Briefing')).toBe(false);
    expect(isArchitectureTerm('Rotation Engine')).toBe(true);
    expect(isArchitectureTerm('Early Warning System')).toBe(false); // marketed allowlist
    expect(isArchitectureTerm('Legacy Backend System')).toBe(true);
  });

  it('caps the 7-service Macro Lens expansion at 4 and removes architecture', () => {
    const { kept, removed } = filterOffers(MACROLENS_SEVEN_OFFERS);
    expect(kept.length).toBeLessThanOrEqual(MAX_SERVICES);
    const keptNames = kept.map((o) => o.itemOffered!.name);
    expect(keptNames).toContain('Daily Market Briefing');
    expect(keptNames).toContain('Should I Worry Diagnostic Tool');
    // Architecture terms must be gone.
    expect(keptNames).not.toContain('AI Synthesis Layer');
    expect(keptNames).not.toContain('Sector Rotation Framework');
    expect(removed.some((r) => r.name === 'AI Synthesis Layer' && r.reason === 'architecture')).toBe(true);
  });

  it('filters inside a parsed JSON-LD object', () => {
    const schema = { '@type': 'Organization', hasOfferCatalog: { '@type': 'OfferCatalog', itemListElement: MACROLENS_SEVEN_OFFERS } };
    const { schema: out } = filterOfferCatalogObject(schema);
    expect(out.hasOfferCatalog.itemListElement.length).toBeLessThanOrEqual(MAX_SERVICES);
  });
});

// --- Test 4: SCHEMA_MISSING classification ---------------------------------
describe('Test 4: SCHEMA_MISSING vs CONTENT_MISSING', () => {
  it('answer in prose but not in FAQ schema => schema_only (not missing)', () => {
    expect(classifyGap(true, false)).toBe('schema_only');
    expect(classifyGap(true, true)).toBe('strong');
    expect(classifyGap(false, false)).toBe('missing');
  });

  it('schema_only recommendation says wrap in FAQPage schema, NOT create content', () => {
    const rec = recommendationFor('schema_only', 'Free. Forever. No paywall.')!;
    expect(rec.toLowerCase()).toContain('faqpage schema');
    expect(rec.toLowerCase()).not.toContain('create dedicated content');
    expect(rec).toContain('Free. Forever. No paywall.'); // shows the source quote
  });

  it('the guard reclassifies a "Missing" flag that has a source quote as schema_only', () => {
    const brand = classifySiteType(MACROLENS_EDITORIAL_HTML);
    const result: AnalysisResult = {
      score: 88, summary: '', criteria: [], recommendations: [], citationProbability: 80,
      queryContentGap: {
        gapScore: 70,
        detectedCapabilities: ['daily brief', 'should I worry tool'],
        generatedQuestions: [{
          question: 'How much does the Macro Lens daily brief subscription cost?',
          answered: true,
          answerQuality: 'Missing', // the model's mistake
          sourceQuote: 'Free. Forever. No paywall on the daily brief.',
        }],
      },
    };
    const guarded = applyAccuracyGuards(result, brand);
    expect(guarded.queryContentGap!.generatedQuestions[0].gapCategory).toBe('schema_only');
  });
});

// --- Tolerant JSON parsing (model output salvage) --------------------------
describe('safeJsonParse: salvages malformed model JSON', () => {
  it('parses clean JSON', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
  });
  it('strips trailing commas before } and ]', () => {
    expect(safeJsonParse('{"a":1,"b":[1,2,],}')).toEqual({ a: 1, b: [1, 2] });
  });
  it('strips markdown code fences', () => {
    expect(safeJsonParse('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('drops leading/trailing prose around the object', () => {
    expect(safeJsonParse('Here is your result:\n{"a":1}\nThanks!')).toEqual({ a: 1 });
  });
  it('throws on genuinely empty input', () => {
    expect(() => safeJsonParse('')).toThrow();
  });
});

// --- Test 5: Non-capability query filtering --------------------------------
describe('Test 5: capability-scoped query generation', () => {
  const capabilities = ['daily email brief', 'should I worry interactive tool'];

  it('drops queries about features the site does not offer', () => {
    const candidates = [
      'Does Macro Lens offer mobile app alerts for market regime changes?',
      'Is the market analysis available for international markets?',
      'How much does the daily brief cost?', // universally useful
      'What are the six signals in the daily brief?', // capability match
    ];
    const kept = filterCandidateQueries(candidates, capabilities);
    expect(kept).not.toContain('Does Macro Lens offer mobile app alerts for market regime changes?');
    expect(kept).not.toContain('Is the market analysis available for international markets?');
    expect(kept).toContain('How much does the daily brief cost?');
    expect(kept).toContain('What are the six signals in the daily brief?');
  });

  it('treats pricing / founder / contact / compliance as universally useful', () => {
    expect(isUniversallyUsefulQuestion('How much does it cost?')).toBe(true);
    expect(isUniversallyUsefulQuestion('Is it free?')).toBe(true);
    expect(isUniversallyUsefulQuestion('Who is the founder behind Macro Lens?')).toBe(true);
    expect(isUniversallyUsefulQuestion('How do I contact support?')).toBe(true);
    expect(isUniversallyUsefulQuestion('Is Macro Lens SEC compliant?')).toBe(true);
    expect(isUniversallyUsefulQuestion('Do you have a mobile app?')).toBe(false);
  });

  it('the guard applies the capability filter end-to-end', () => {
    const brand = classifySiteType(MACROLENS_EDITORIAL_HTML);
    const result: AnalysisResult = {
      score: 88, summary: '', criteria: [], recommendations: [], citationProbability: 80,
      queryContentGap: {
        gapScore: 70,
        detectedCapabilities: ['daily email brief', 'should I worry tool'],
        generatedQuestions: [
          { question: 'Do you have a mobile app for alerts?', answered: false, answerQuality: 'Missing', gapCategory: 'missing' },
          { question: 'Is it free?', answered: true, answerQuality: 'Strong', gapCategory: 'schema_only', sourceQuote: 'Free. Forever.' },
          { question: 'What is in the daily email brief?', answered: true, answerQuality: 'Strong', gapCategory: 'strong' },
          { question: 'Who is the founder?', answered: true, answerQuality: 'Strong', gapCategory: 'strong' },
        ],
      },
    };
    const guarded = applyAccuracyGuards(result, brand);
    const questions = guarded.queryContentGap!.generatedQuestions.map((q) => q.question);
    expect(questions).not.toContain('Do you have a mobile app for alerts?');
    expect(questions).toContain('Is it free?');
  });
});
