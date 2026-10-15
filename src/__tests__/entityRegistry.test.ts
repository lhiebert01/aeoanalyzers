import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getGraphJsonLd } from '../lib/json-ld';

/** WO-AEO-ENTITY-REGISTRY-013 — the site's sameAs values come from the registry, and only those. */
const REG = readFileSync('docs/identity/ENTITY-REGISTRY.md', 'utf8');
const graph: any[] = (getGraphJsonLd() as any)['@graph'];
const node = (t: string) => graph.find((n) => n['@type'] === t);
const qid = (entity: string) => REG.match(new RegExp(`\\| ${entity} \\| (Q\\d+) \\| (https://www\\.wikidata\\.org/wiki/Q\\d+) \\|`))!;

describe('entity registry ↔ structured data', () => {
  it('the Organization and SoftwareApplication carry exactly their own Wikidata item', () => {
    expect(node('Organization')['@id']).toBe('https://pigenai.com/#org');
    expect(node('Organization').sameAs).toEqual([qid('PIGENAI LLC')[2]]);
    expect(node('SoftwareApplication').sameAs).toEqual([qid('AEO Analyzers')[2]]);
    expect(qid('PIGENAI LLC')[1]).toBe('Q141739140');
    expect(qid('AEO Analyzers')[1]).toBe('Q141739225');
  });
  it('the registry records the app @id the site actually serves', () => {
    expect(REG).toContain(`| SoftwareApplication | ${node('SoftwareApplication')['@id'].replace(/^https?:\/\/[^/]+/, 'https://aeoanalyzers.com')} |`);
  });
  it('the registry carries no charter number, tax ID or private email (public repo)', () => {
    expect(REG).not.toMatch(/LC\d{6,}|\b\d{2}-\d{7}\b|@gmail\.com/i);
  });
  it('no listing is marked live before the founder confirms it', () => {
    const rows = REG.split('## Listings')[1].split('## Canonical')[0].split('\n').filter((l) => /^\| (AlternativeTo|Crunchbase|G2|Slashdot|LinkedIn)/.test(l));
    expect(rows).toHaveLength(5);
    for (const r of rows) expect(r).toMatch(/\| \| planned \(founder, Oct 16\) \|/);
  });
});
