import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** sameAs asserts IDENTITY — "this node and that URL are the same entity."
 *
 *  Until Sep 7 2026 our Organization node declared
 *  `sameAs: ['https://pigenai.com', 'https://pigenai.com/#org']` and the
 *  SoftwareApplication node declared `sameAs: ['https://pigenai.com']`. Together
 *  those told every index that aeoanalyzers.com, the portfolio hub, and the
 *  product were one entity. That is the exact failure this product reports to
 *  customers as an entity collision, and the standing rule — a collision is never
 *  a sameAs — applies to us.
 *
 *  A parent relationship is expressed by REFERENCE (provider / publisher /
 *  developer / parentOrganization pointing at an @id), never by identity.
 *
 *  This test guards the served graph, not a helper: it reads the module source,
 *  because a future edit re-adding the URL is the failure mode. */

const SRC = readFileSync(resolve(__dirname, '../lib/json-ld.ts'), 'utf8');

/** Every `sameAs: [...]` literal in the module, with its array contents. */
function sameAsArrays(): string[][] {
  return [...SRC.matchAll(/sameAs:\s*\[([^\]]*)\]/g)].map((m) =>
    m[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
      .filter(Boolean)
  );
}

describe('sameAs never asserts identity with the portfolio hub', () => {
  it('no sameAs entry points at pigenai.com or its org node', () => {
    const offenders = sameAsArrays()
      .flat()
      .filter((v) => /pigenai\.com/i.test(v) || v === 'PIGENAI_ORG_ID');
    expect(offenders).toEqual([]);
  });

  it('no sameAs entry points at a sibling PI GenAI product', () => {
    const siblings = /lanternpost\.app|charactercanvas\.ai|neoaesop\.com|quizshowdown\.live|getmacrolens\.com|sanctumshield\.com/i;
    const offenders = sameAsArrays().flat().filter((v) => siblings.test(v));
    expect(offenders).toEqual([]);
  });

  it('the parent relationship is still expressed by reference', () => {
    // The hub @id must remain reachable through a reference-shaped property,
    // so removing sameAs did not orphan the relationship.
    expect(SRC).toMatch(/PIGENAI_ORG_ID\s*=\s*'https:\/\/pigenai\.com\/#org'/);
    expect(SRC).toMatch(/(provider|publisher|developer|parentOrganization):\s*\{\s*'@id'/);
  });

  it('the founder Person node keeps its own verified profiles', () => {
    // The rule is about entity fusion, not about removing real profiles. The
    // founder's LinkedIn and Credly badge are genuinely the same person.
    const founder = sameAsArrays().find((a) => a.some((v) => /credly\.com/.test(v)));
    expect(founder).toBeDefined();
    expect(founder!.some((v) => /linkedin\.com/.test(v))).toBe(true);
  });
});
