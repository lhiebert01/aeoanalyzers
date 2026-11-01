import { describe, it, expect, vi } from 'vitest';
import { classifySiteType } from '../lib/brandType';
import { applyAccuracyGuards, type AnalysisResult } from '../services/geminiService';
import { generateSchema } from '../lib/schemaGenerator';
import {
  SCHEMA_COMPLETE_TEXT, VERIFY_CAVEAT, ALL_STRONG_NOTE, selectTopPriorities, servedEntity, orgConflicts,
} from '../lib/reportGuards';

/** AEO Score report fixes, founder rulings 1 Nov 2026. Each test checks the report the customer
 *  receives (the guarded result, or the Word file's extracted text), not just a helper. */

// A homepage that already serves a linked graph: the Organization is the parent company, the
// product name is in og:site_name. This is aeoanalyzers.com's own shape.
const LINKED_GRAPH_HTML = `<html><head><title>AEO Analyzers</title>
<meta property="og:site_name" content="AEO Analyzers">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
 {"@type":"Organization","@id":"https://pigenai.com/#org","name":"PIGENAI LLC","url":"https://pigenai.com"},
 {"@type":"WebSite","@id":"https://aeoanalyzers.com/#website","url":"https://aeoanalyzers.com","publisher":{"@id":"https://pigenai.com/#org"}},
 {"@type":"SoftwareApplication","@id":"https://aeoanalyzers.com/#app","name":"AEO Analyzers","publisher":{"@id":"https://pigenai.com/#org"}}
]}</script></head><body><h1>AEO Analyzers</h1><p>Measures what AI answer engines say.</p></body></html>`;

const base = (over: Partial<AnalysisResult> = {}): AnalysisResult => ({
  score: 80, summary: '', criteria: [], recommendations: [], citationProbability: 70, ...over,
} as AnalysisResult);

async function docxText(result: AnalysisResult): Promise<string> {
  const g: any = globalThis;
  g.document = { createElement: () => ({ set href(_v: any) {}, download: '', click() {}, remove() {} }), body: { appendChild() {}, removeChild() {} } };
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} } as any);
  const { Packer } = await import('docx');
  let captured: any = null;
  const orig = (Packer as any).toBlob;
  (Packer as any).toBlob = async (doc: any) => (captured = await (Packer as any).toBuffer(doc));
  try {
    const { generateDocxReport } = await import('../services/docxGenerator');
    await generateDocxReport(result, 'https://aeoanalyzers.com', 'Test User', null);
  } finally { (Packer as any).toBlob = orig; }
  const { default: JSZip } = await import('jszip');
  const xml = await (await JSZip.loadAsync(captured)).file('word/document.xml')!.async('string');
  // Tag-stripped paragraph text: Word splits strings across runs, so never grep raw XML.
  return xml.split(/<w:p[ >]/).map((p) => (p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map((t) => t.replace(/<[^>]+>/g, '')).join('')).join('\n');
}

describe('a. an existing linked JSON-LD graph is respected', () => {
  it('reads the served Organization and its links', () => {
    const s = servedEntity(LINKED_GRAPH_HTML);
    expect(s).toMatchObject({ hasOrg: true, orgId: 'https://pigenai.com/#org', orgName: 'PIGENAI LLC', linked: true });
  });

  it('the report says nothing to paste, and no block carries a conflicting Organization', () => {
    const r = applyAccuracyGuards(base({
      // The model's own guess: the product name on a fresh @id. Exactly the conflict.
      candidateSchema: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', '@id': 'https://aeoanalyzers.com/#org', name: 'AEO Analyzers' }),
    }), classifySiteType(LINKED_GRAPH_HTML), LINKED_GRAPH_HTML, 'https://aeoanalyzers.com/');
    expect(r.schemaComplete).toBe(true);
    const served = servedEntity(LINKED_GRAPH_HTML);
    for (const k of ['schemaSnippet', 'verifiedSchema', 'comprehensiveSchema', 'candidateSchema', 'generatedSchema'] as const) {
      expect(orgConflicts(r[k] as string | undefined, served)).toEqual([]);
    }
    expect(r.candidateSchema).toBeUndefined();
    expect(r.verifiedSchema).toBeUndefined();
  });

  it('a needed addition is emitted on the site\'s own @id and name, never a new Organization', () => {
    const served = servedEntity(LINKED_GRAPH_HTML);
    const gen = generateSchema({
      domain: 'aeoanalyzers.com', declaredName: 'AEO Analyzers', ownedDomains: ['aeoanalyzers.com'], collisions: ['aeoanalyzer.com'],
      served: { hasOrg: true, hasOrgId: true, orgId: served.orgId, orgName: served.orgName, orgType: served.orgType },
    });
    expect(gen.complete).toBeFalsy();
    expect(orgConflicts(gen.jsonLd, served)).toEqual([]);
    expect(JSON.parse(gen.jsonLd!)['@graph'][0]['@id']).toBe('https://pigenai.com/#org');
  });

  it('a site with no markup still gets a generated block (the guard does not over-fire)', () => {
    const html = '<html><head><title>Lantern Post</title><meta property="og:site_name" content="Lantern Post"></head><body>Lantern Post</body></html>';
    const r = applyAccuracyGuards(base(), classifySiteType(html), html, 'https://lanternpost.app/');
    expect(r.schemaComplete).toBe(false);
    expect(r.verifiedSchema).toContain('"Lantern Post"');
  });

  it('the Word report says so in words', async () => {
    const text = await docxText(base({ schemaComplete: true, criteria: [{ name: 'Entity', score: 6, feedback: 'f' }] }));
    expect(text).toContain(SCHEMA_COMPLETE_TEXT);
  });
});

describe('b. Top priorities never list an area scoring 8 or more', () => {
  const crit = (scores: number[]) => scores.map((s, i) => ({ name: `Area ${i}`, score: s, feedback: `fb ${i}` }));
  it('at the threshold: 8 is not a priority, 7.9 is', () => {
    const t = selectTopPriorities(crit([8, 7.9, 9]), []);
    expect(t.kind).toBe('areas');
    if (t.kind === 'areas') expect(t.areas.map((a) => a.score)).toEqual([7.9]);
  });
  it('all 8+: says so and shows the top checklist items, High first', () => {
    const t = selectTopPriorities(crit([8, 9, 10]), [
      { action: 'Low thing', priority: 'Low' }, { action: 'High thing', priority: 'High' }, { action: 'Medium thing', priority: 'Medium' },
    ]);
    expect(t.kind).toBe('allStrong');
    if (t.kind === 'allStrong') expect(t.checklist.map((c) => c.action)).toEqual(['High thing', 'Medium thing', 'Low thing']);
  });
  it('the Word report lists no 8+ area under Top 3 Priorities', async () => {
    const text = await docxText(base({
      criteria: crit([8, 9, 10]),
      implementationChecklist: [{ category: 'Technical', action: 'Submit the sitemap', priority: 'High' }],
    }));
    const section = text.slice(text.indexOf('Top 3 Priorities'), text.indexOf('Implementation Instructions'));
    expect(section).toContain(ALL_STRONG_NOTE);
    expect(section).toContain('1. Submit the sitemap');
    expect(section).not.toMatch(/Area \d \(Score/);
  });
});

describe('c. Rewrite examples never propose naming an AI model or version', () => {
  // A SaaS page: editorial pages get no rewrites at all (voice rule), so they cannot test this.
  const SAAS = classifySiteType('<html><body>Pricing. Start free trial. Sign up. Features. Integrations. API.</body></html>');
  it('drops a rewrite that adds a model name or version, keeps the rest', () => {
    const r = applyAccuracyGuards(base({
      contentRewrites: [
        { page: 'hero', current: 'Powered by Google Gemini.', proposed: 'Powered by Google Gemini 3.6 Flash.' },
        { page: 'hero', current: 'Fast answers.', proposed: 'Answers drawn from GPT-5 and Claude Opus.' },
        { page: 'about', current: 'Industry-leading tools.', proposed: 'Tools that store every answer as a transcript.' },
      ],
    }), SAAS);
    expect(r.contentRewrites!.map((x) => x.page)).toEqual(['about']);
    expect(JSON.stringify(r.contentRewrites)).not.toMatch(/gemini|gpt|claude/i);
  });
  it('a horoscope page keeping its own word "Gemini" is not a proposal', () => {
    const r = applyAccuracyGuards(base({
      contentRewrites: [{ page: 'sign', current: 'Gemini is a lovely sign.', proposed: 'Gemini runs May 21 to June 20.' }],
    }), SAAS);
    expect(r.contentRewrites).toHaveLength(1);
  });
});

describe('d. Search Console / Bing verification items carry the DNS caveat', () => {
  it('model checklist items and recommendations are qualified once', () => {
    const r = applyAccuracyGuards(base({
      implementationChecklist: [
        { category: 'Technical', action: 'Verify your site in Google Search Console', priority: 'High' },
        { category: 'Technical', action: 'Add an FAQ section', priority: 'Low' },
      ],
      recommendations: ['Claim and verify the property in Bing Webmaster Tools.'],
    }), classifySiteType('<html></html>'));
    expect(r.implementationChecklist![0].action).toBe(`${VERIFY_CAVEAT} Verify your site in Google Search Console`);
    expect(r.implementationChecklist![1].action).toBe('Add an FAQ section');
    expect(r.recommendations[0].startsWith(VERIFY_CAVEAT)).toBe(true);
    const again = applyAccuracyGuards(r, classifySiteType('<html></html>'));
    expect(again.recommendations[0].split(VERIFY_CAVEAT).length).toBe(2);
  });
  it('the scan\'s own Bing finding and the Word rollout bullet carry it', async () => {
    const html = '<html><head><title>X</title></head><body>X</body></html>';
    const r = applyAccuracyGuards(base(), classifySiteType(html), html, 'https://example.com/');
    const bing = r.indexCoverage!.recommendations.find((x) => /msvalidate/.test(x))!;
    expect(bing.startsWith(VERIFY_CAVEAT)).toBe(true);
    const text = await docxText(base({ criteria: [{ name: 'A', score: 5, feedback: 'f' }] }));
    expect(text).toContain(`${VERIFY_CAVEAT} Verify in Bing Webmaster Tools`);
  });
});
