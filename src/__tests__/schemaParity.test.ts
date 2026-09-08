import { describe, it, expect } from 'vitest';
import { generateSchema } from '../lib/schemaGenerator';
import { remediationSnippet } from '../lib/sweepActions';

/** WO-003 acceptance item 1, which existed and was never run:
 *  generate BOTH report types for one domain and diff the JSON-LD to zero.
 *
 *  Before this, the analysis report shipped model-authored markup while the sweep used
 *  deterministic code, and the two disagreed for the same domain on the same day. */

/** Pull the JSON-LD out of whatever the sweep renderer produced. */
function jsonLdFromSweep(lines: string[]): string | null {
  const text = lines.join('\n');
  const m = text.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/);
  return m ? m[1].trim() : null;
}

const FACTS = {
  domain: 'lanternpost.app',
  brand: 'Lantern Post',
  declaredName: 'Lantern Post',
  ownedDomains: ['lanternpost.app', 'aeoanalyzers.com'],
  collisions: ['lantern.io', 'lanterns.app'],
};

describe('acceptance 1 — both report types emit identical JSON-LD', () => {
  it('diffs to zero for the same domain and facts', () => {
    // The ANALYSIS path calls generateSchema directly (geminiService applyAccuracyGuards).
    const analysis = generateSchema(FACTS).jsonLd;

    // The SWEEP path renders through remediationSnippet, which embeds the same generator.
    const sweep = jsonLdFromSweep(
      remediationSnippet(FACTS.domain, FACTS.brand, FACTS.collisions, {
        declaredName: FACTS.declaredName,
        ownedDomains: FACTS.ownedDomains,
      })
    );

    expect(analysis).toBeTruthy();
    expect(sweep).toBeTruthy();
    // The diff, character for character.
    expect(sweep).toBe(analysis);
    // and both parse to the same object
    expect(JSON.parse(sweep!)).toEqual(JSON.parse(analysis!));
  });

  it('both refuse together on a brand/domain mismatch — silence in both, not one', () => {
    const bad = { domain: 'thesmartaiworker.com', brand: 'AEO Analyzers', ownedDomains: ['aeoanalyzers.com'], collisions: ['aeoanalyzers.com'] };
    const analysis = generateSchema(bad);
    const sweep = remediationSnippet(bad.domain, bad.brand, bad.collisions, { ownedDomains: bad.ownedDomains }).join('\n');

    expect(analysis.jsonLd).toBeNull();
    expect(analysis.refusedBecause).toBeTruthy();
    expect(sweep).not.toContain('"@type": "Organization"');
    expect(sweep).toContain('not generating schema');
  });

  it('the analysis path no longer falls back to model-authored markup', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { resolve } = require('node:path') as typeof import('node:path');
    const src = readFileSync(resolve(__dirname, '../services/geminiService.ts'), 'utf8');
    // On refusal it clears the model's fields rather than leaving them to render.
    expect(src).toMatch(/result\.verifiedSchema = undefined/);
    expect(src).toMatch(/result\.schemaSnippet = undefined/);
    // and on success it overwrites all three with the generator's output
    expect(src).toMatch(/result\.schemaSnippet = gen\.jsonLd/);
  });
});
