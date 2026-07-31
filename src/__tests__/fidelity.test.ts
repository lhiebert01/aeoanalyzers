import { describe, it, expect } from 'vitest';
import { extractTruthRecord, extractJsonLdNodes } from '../lib/truthRecord';
import { scoreFidelity, extractFounderMentions, classifyRunFidelity, summarizeFidelity } from '../lib/fidelity';

// Truth record modeled on aeoanalyzers.com: sole founder Lindsay Hiebert.
const AEO_HTML = `
<html><head>
<meta property="og:site_name" content="AEO Analyzers" />
<meta name="author" content="Lindsay Hiebert" />
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
  {"@type":"Organization","name":"AEO Analyzers","founder":{"@id":"#founder"}},
  {"@type":"Person","@id":"#founder","name":"Lindsay Hiebert","jobTitle":"Founder","sameAs":["https://www.linkedin.com/in/lindsayhiebert/"]},
  {"@type":"SoftwareApplication","name":"AEO Analyzers","author":{"@id":"#founder"},"creator":{"@id":"#founder"}}
]}
</script>
</head><body><h1>AEO Analyzers</h1></body></html>`;

const LLMS = `AEO Analyzers\nFounder: Lindsay Hiebert, CISSP — https://www.linkedin.com/in/lindsayhiebert/`;

describe('truthRecord extraction', () => {
  it('parses JSON-LD @graph nodes', () => {
    expect(extractJsonLdNodes(AEO_HTML).length).toBeGreaterThanOrEqual(3);
  });
  it('extracts the sole canonical founder and brand', () => {
    const tr = extractTruthRecord(AEO_HTML, LLMS);
    expect(tr.brandName).toBe('AEO Analyzers');
    expect(tr.founders).toContain('Lindsay Hiebert');
    // No stray co-founder.
    expect(tr.founders.some((f) => /nissen/i.test(f))).toBe(false);
  });
});

describe('extractFounderMentions', () => {
  it('catches names asserted in a founder role (both directions)', () => {
    expect(extractFounderMentions('The tool was co-founded by Jesper Nissen last year.')).toContain('Jesper Nissen');
    expect(extractFounderMentions('Lindsay Hiebert, the creator, built it.')).toContain('Lindsay Hiebert');
  });
});

describe('scoreFidelity — the Jesper Nissen misattribution', () => {
  const truth = extractTruthRecord(AEO_HTML, LLMS);

  it('flags a fabricated co-founder as a high-severity hallucination', () => {
    const perplexityAnswer =
      'AEO Analyzers was created by Lindsay Hiebert and co-founded by Jesper Nissen, a Danish SEO specialist.';
    const f = scoreFidelity(perplexityAnswer, truth);
    expect(f.hallucinatedFounders).toContain('Jesper Nissen');
    expect(f.correctFounders).toContain('Lindsay Hiebert');
    expect(f.fidelityPct).toBeLessThan(100);
    const issue = f.issues.find((i) => i.type === 'hallucinated_founder');
    expect(issue).toBeTruthy();
    expect(issue!.wrong).toBe('Jesper Nissen');
    expect(issue!.correct).toContain('Lindsay Hiebert');
    expect(issue!.severity).toBe('high');
  });

  it('scores a correct, sole-founder answer at full fidelity', () => {
    const good = 'AEO Analyzers is an AEO audit tool founded by Lindsay Hiebert.';
    const f = scoreFidelity(good, truth);
    expect(f.hallucinatedFounders).toHaveLength(0);
    expect(f.correctFounders).toContain('Lindsay Hiebert');
    expect(f.brandIdentified).toBe(true);
    expect(f.fidelityPct).toBe(100);
  });

  it('matches a canonical founder by surname alone', () => {
    const f = scoreFidelity('The founder Hiebert launched it.', truth);
    expect(f.hallucinatedFounders).toHaveLength(0);
  });

  it('does NOT flag the client’s own parent ORGANIZATION as a fabricated founder', () => {
    // Real dogfood false positive: an engine correctly said the tool is by
    // "PI GenAI LLC" (the parent company) — an org creator is not a fake person-founder.
    const f = scoreFidelity('AEO Analyzers was created by PI GenAI LLC, founded by Lindsay Hiebert.', truth);
    expect(f.hallucinatedFounders).not.toContain('PI GenAI LLC');
    expect(f.hallucinatedFounders).toHaveLength(0);
    expect(f.correctFounders).toContain('Lindsay Hiebert');
    expect(classifyRunFidelity(true, 'AEO Analyzers is a product by PIGENAI LLC.', truth).state).toBe('cited-accurate');
    // A fabricated PERSON co-founder is still caught.
    expect(classifyRunFidelity(true, 'AEO Analyzers was co-founded by Jesper Nissen.', truth).state).toBe('cited-drifted');
  });
});

describe('classifyRunFidelity + summarizeFidelity (B1 — sweep integration)', () => {
  const truth = extractTruthRecord(AEO_HTML, LLMS);

  it('splits cited into accurate vs drifted; leaves not-cited alone', () => {
    expect(classifyRunFidelity(false, 'anything', truth).state).toBe('not-cited');
    expect(classifyRunFidelity(true, 'AEO Analyzers, founded by Lindsay Hiebert.', truth).state).toBe('cited-accurate');
    expect(classifyRunFidelity(true, 'AEO Analyzers was co-founded by Jesper Nissen.', truth).state).toBe('cited-drifted');
  });

  it('summarizes a mixed set of branded answers with the fabricated name surfaced', () => {
    const s = summarizeFidelity([
      { cited: true, transcript: 'AEO Analyzers is by Lindsay Hiebert.' },              // accurate
      { cited: true, transcript: 'AEO Analyzers, co-founded by Jesper Nissen, ...' },   // drifted
      { cited: false, transcript: "I couldn't find aeoanalyzers.com" },                 // not cited
    ], truth);
    expect(s.citedAccurate).toBe(1);
    expect(s.citedDrifted).toBe(1);
    expect(s.hallucinatedFounders).toContain('Jesper Nissen');
    expect(s.issues.length).toBeGreaterThanOrEqual(1);
  });
});
