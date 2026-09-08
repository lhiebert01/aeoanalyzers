import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getGraphJsonLd } from '../lib/json-ld';

const ROOT_DIR = resolve(__dirname, '../..');

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

/** WO-PORTFOLIO-PERSON-IDENTITY-001 — the first-person blank.
 *
 *  A Sep 8 2026 sweep of a sibling property returned "She is the founder of PI GenAI
 *  LLC". The engine was not working from bad data but from NO data: the page is written
 *  entirely in the first person, so no third-person pronoun appears anywhere, and the
 *  markup declared no gender. Asked who this person is, it inferred from the name.
 *
 *  These four fields are identity facts, not claims, and they are the fix. */
describe('the Person node states identity rather than leaving it to inference', () => {
  // Assert on the EMITTED graph, not the source text: a comment explaining what was
  // removed legitimately quotes it, and a source-text test would fail on the comment
  // while passing on a genuine regression.
  const person = () => {
    const g: any = getGraphJsonLd();
    const nodes = g['@graph'] || g;
    return (Array.isArray(nodes) ? nodes : [nodes]).find((n: any) => n['@type'] === 'Person');
  };

  it('declares givenName, familyName and gender', () => {
    const p = person();
    expect(p.givenName).toBe('Lindsay');
    expect(p.familyName).toBe('Hiebert');
    expect(p.gender).toBe('Male');
  });

  it('uses the ratified jobTitle form shared across every PI GenAI property', () => {
    expect(person().jobTitle).toBe('Founder and CEO, PIGENAI LLC');
  });

  it('carries the concise biography the founder prefers', () => {
    const blob = JSON.stringify(person());
    expect(blob).toContain('Cisco');
    expect(blob).toContain('Intel');
    expect(blob).toContain('CISSP');
  });

  it('records the OMISSION as editorial, never as unverified', () => {
    // Founder ruling Sep 8 2026. The carrier detail is left out for BREVITY. The
    // founder's own employment history is sourced from the founder; it is not a
    // measurement claim about a customer, and the grounded-output rule does not reach
    // it. Conflating the two standards already cost a true fact once, so the reason is
    // pinned here: a future session must not strip other biographical facts as
    // "unsupported", nor re-add this one as a correction.
    const src = readFileSync(resolve(ROOT_DIR, 'src/lib/json-ld.ts'), 'utf8');
    expect(src).toMatch(/omitted below for BREVITY/);
    expect(src).toMatch(/sourced FROM THE FOUNDER/);
    expect(src).toMatch(/do not strip any other stated/i);
    // and it must NOT record the omission as a verification failure
    expect(src).not.toMatch(/removed[^.]*because it was unverified\b(?!\.)/);
  });
});
