import { describe, it, expect } from 'vitest';
import { redactFixFields, FIX_FIELDS } from '../lib/fixGating';

const SAMPLE = JSON.stringify({
  // free diagnostic (must survive)
  score: 82,
  summary: 'Your site is discoverable but weak on category questions.',
  criteria: [{ name: 'Entity', score: 8 }],
  citationProbability: 61,
  scoreBreakdown: { entity: 8 },
  // paid fixes (must be stripped for free)
  recommendations: ['Add an FAQ page'],
  schemaSnippet: '{"@context":"https://schema.org","@type":"Organization"}',
  verifiedSchema: '{"@graph":[]}',
  candidateSchema: '{"@graph":[]}',
  comprehensiveSchema: '{"@graph":[]}',
  contentRewrites: [{ current: 'a', proposed: 'b', page: '/' }],
  metaDescriptionRewrite: { current: 'x', suggested: 'y' },
  implementationChecklist: [{ category: 'schema', action: 'add JSON-LD', priority: 'high' }],
});

/** A response shaped like the ADVANCED cards — the half that leaked in the
 *  2026-09-19 QA run. Every value below is something `AdvancedAnalysisCards`
 *  hides behind `isPaid`, so none of it may reach a free caller. */
const ADVANCED = JSON.stringify({
  score: 91,
  entityGraphAudit: {
    score: 92,
    sameAsFound: true,
    founderEntityFound: true,
    napConsistencyNote: 'Entity name and publisher are clearly defined.',
    sameAsUrls: ['https://github.com/example', 'https://x.com/example'],
    recommendations: ['Add reciprocal links', 'Keep disambiguatingDescription', 'Add parentOrganization'],
  },
  passageExtractability: {
    selfContainedScore: 85,
    guidance: 'Anchor standalone statements with the explicit brand name.',
    pronounHeavyPassages: [
      { excerpt: 'We count lanterns, not lives.', issue: "Starts with 'We'.", suggestedRewrite: 'Example Co counts lanterns, not lives.' },
      { excerpt: 'They open your card.', issue: "Generic 'They'.", suggestedRewrite: 'Recipients open an Example Co card.' },
    ],
  },
  schemaDensityRecommendations: [
    { schemaType: 'BreadcrumbList', reason: 'Clarifies hierarchy.', benefit: 'Enhanced SERP paths.' },
    { schemaType: 'VideoObject', reason: 'Video has no markup.', benefit: 'Citable in rich answers.' },
  ],
  citationHookDensity: {
    factualDensityScore: 88,
    statsCount: 3,
    percentagesCount: 0,
    exampleHooks: ['First hook stays.', 'Second hook is paid.', 'Third hook is paid.'],
  },
  queryContentGap: {
    gapScore: 100,
    generatedQuestions: [
      { question: 'How much does it cost?', answerQuality: 'Strong', gapCategory: 'strong', sourceQuote: 'Receiving a card is free, forever.' },
      { question: 'Who created it?', answerQuality: 'Strong', gapCategory: 'strong', sourceQuote: 'Made by a named founder.' },
    ],
  },
  zeroClickPredictor: {
    featuredSnippetReadiness: 92,
    snippetOpportunities: [{ currentText: 'How to send: 1. 2. 3.', suggestedFormat: 'HowTo Schema', reason: 'Numbered sequence.' }],
  },
  semanticChunking: {
    chunkingScore: 95,
    longBlocks: [{ approximateWordCount: 320, context: 'About section', suggestedHeading: 'What Example Co does' }],
  },
  schemaProvenance: [
    { field: 'Organization.name', value: 'Example Co', provenance: 'detected', confidence: 1, sourceQuote: 'Example Co is a free service' },
  ],
});

describe('redactFixFields (server-side paywall for fixes)', () => {
  it('strips EVERY paid fix field from a free response', () => {
    const out = JSON.parse(redactFixFields(SAMPLE));
    for (const f of FIX_FIELDS) {
      expect(out[f], `fix field "${f}" must not leak to a free user`).toBeUndefined();
    }
  });

  it('preserves the free diagnostic (score, summary, criteria, probability)', () => {
    const out = JSON.parse(redactFixFields(SAMPLE));
    expect(out.score).toBe(82);
    expect(out.summary).toContain('discoverable');
    expect(out.criteria).toEqual([{ name: 'Entity', score: 8 }]);
    expect(out.citationProbability).toBe(61);
    expect(out.gated).toBe(true);
  });

  it('leaves a response with no paid content unchanged (no spurious gating marker)', () => {
    const scoreOnly = JSON.stringify({ score: 90, summary: 'ok' });
    expect(redactFixFields(scoreOnly)).toBe(scoreOnly);
  });

  it('is a safe no-op on non-JSON / non-object text', () => {
    expect(redactFixFields('not json at all')).toBe('not json at all');
    expect(redactFixFields('[1,2,3]')).toBe('[1,2,3]');
  });
});

describe('redactFixFields — nested paid content in the advanced cards', () => {
  const out = () => JSON.parse(redactFixFields(ADVANCED));

  it('removes the portfolio-level entity-resolution fixes', () => {
    expect(out().entityGraphAudit.recommendations).toEqual([]);
  });

  it('removes the entity-anchored rewrites', () => {
    const passages = out().passageExtractability.pronounHeavyPassages;
    for (const p of passages) {
      expect(p.suggestedRewrite).toBeUndefined();
      expect(p.excerpt).toBeUndefined();
      expect(p.issue).toBeUndefined();
    }
  });

  it("removes each schema's reason and benefit but keeps the type", () => {
    for (const rec of out().schemaDensityRecommendations) {
      expect(rec.schemaType).toBeTruthy();
      expect(rec.reason).toBeUndefined();
      expect(rec.benefit).toBeUndefined();
    }
  });

  it('keeps the first citable sentence and withholds the rest', () => {
    const hooks = out().citationHookDensity.exampleHooks;
    expect(hooks[0]).toBe('First hook stays.');
    expect(hooks[1]).toBe('');
    expect(hooks[2]).toBe('');
  });

  it('removes the on-page quotes sold with the query-gap fixes', () => {
    for (const q of out().queryContentGap.generatedQuestions) {
      expect(q.sourceQuote).toBeUndefined();
      expect(q.question).toBeTruthy();       // the question itself is the free diagnosis
      expect(q.gapCategory).toBeTruthy();
    }
  });

  it('withholds the schema audit trail along with the schema itself', () => {
    expect(out().schemaProvenance).toEqual([]);
  });

  it('removes snippet opportunities and suggested headings', () => {
    expect(out().zeroClickPredictor.snippetOpportunities[0].currentText).toBeUndefined();
    expect(out().zeroClickPredictor.snippetOpportunities[0].suggestedFormat).toBeUndefined();
    expect(out().semanticChunking.longBlocks[0].suggestedHeading).toBeUndefined();
  });

  it('proves the leak is closed: no paid string survives anywhere in the payload', () => {
    const redacted = redactFixFields(ADVANCED);
    const MUST_NOT_APPEAR = [
      'Example Co counts lanterns',      // entity-anchored rewrite
      'Recipients open an Example Co',   // entity-anchored rewrite
      'Add reciprocal links',            // entity-graph fix
      'Clarifies hierarchy',             // schema reason
      'Enhanced SERP paths',             // schema benefit
      'Second hook is paid',             // withheld citable sentence
      'Receiving a card is free',        // on-page quote to reuse
      'HowTo Schema',                    // snippet format
      'What Example Co does',            // suggested heading
      'Example Co is a free service',    // provenance sourceQuote
    ];
    for (const s of MUST_NOT_APPEAR) {
      expect(redacted, `"${s}" must not survive redaction`).not.toContain(s);
    }
  });

  it('PRESERVES what the free cards render — scores, labels and array COUNTS', () => {
    const o = out();
    // Counts drive the upgrade prompts ("Unlock 2 entity-anchored rewrites",
    // "See all 3 citable sentences"). Deleting the arrays would close the leak
    // AND silently remove the upsell.
    expect(o.passageExtractability.pronounHeavyPassages).toHaveLength(2);
    expect(o.citationHookDensity.exampleHooks).toHaveLength(3);
    expect(o.zeroClickPredictor.snippetOpportunities).toHaveLength(1);
    expect(o.semanticChunking.longBlocks).toHaveLength(1);
    expect(o.schemaDensityRecommendations).toHaveLength(2);
    // Free-visible diagnosis survives intact.
    expect(o.entityGraphAudit.score).toBe(92);
    expect(o.entityGraphAudit.sameAsUrls).toHaveLength(2);
    expect(o.entityGraphAudit.napConsistencyNote).toBeTruthy();
    expect(o.passageExtractability.selfContainedScore).toBe(85);
    expect(o.passageExtractability.guidance).toBeTruthy();
    expect(o.citationHookDensity.factualDensityScore).toBe(88);
    expect(o.queryContentGap.gapScore).toBe(100);
    expect(o.zeroClickPredictor.featuredSnippetReadiness).toBe(92);
    expect(o.semanticChunking.chunkingScore).toBe(95);
    expect(o.gated).toBe(true);
  });
});
