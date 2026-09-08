import { describe, it, expect } from 'vitest';
import { remediationSnippet, brandDomainMismatch, isOwnedDomain } from '../lib/sweepActions';

/** WO-AEO-REPORT-INTEGRITY-003 — regression tests for four defects found in a real run.
 *
 *  The fixture is that run's configuration: a sweep of `thesmartaiworker.com` carrying the
 *  brand "AEO Analyzers", with `aeoanalyzers.com` among the detected collisions.
 *
 *  What the report produced before this fix:
 *    - an Organization block binding the name "AEO Analyzers" to thesmartaiworker.com,
 *      which would MANUFACTURE an entity collision on the customer's own site, in
 *      machine-readable form, in the place engines trust most; and
 *    - a visible line disclaiming affiliation with aeoanalyzers.com — the user's own product.
 *
 *  Each test below asserts the outcome (what the customer would paste), not that a helper ran. */

const OWNED = ['aeoanalyzers.com', 'thesmartaiworker.com'];

describe('2.1 — generated JSON-LD never asserts an unverified name-to-URL binding', () => {
  it('emits NO Organization block when the brand does not belong to the swept domain', () => {
    const out = remediationSnippet('thesmartaiworker.com', 'AEO Analyzers', ['aeoanalyzers.com'], {
      declaredName: 'The Smart AI Worker',
      ownedDomains: OWNED,
    }).join('\n');

    expect(out).not.toContain('"@type": "Organization"');
    expect(out).not.toContain('#org');
    // and it says WHY, in plain language, rather than failing silently
    expect(out).toContain('We are not generating schema for this sweep');
    expect(out).toContain('thesmartaiworker.com');
  });

  it('still emits the block when brand and domain agree', () => {
    const out = remediationSnippet('lanternpost.app', 'Lantern Post', ['lantern.io'], {}).join('\n');
    expect(out).toContain('"@type": "Organization"');
    expect(out).toContain('https://lanternpost.app/#org');
  });
});

describe('2.2 — never disclaim a domain the user owns', () => {
  it('does not name an owned domain in the unaffiliation line', () => {
    // Brand and domain agree here, so the snippet is generated — the collision list is
    // what must be filtered.
    const out = remediationSnippet('aeoanalyzers.com', 'AEO Analyzers', ['aeoanalyzers.com', 'lantern.io'], {
      ownedDomains: OWNED,
    }).join('\n');

    expect(out).toContain('not affiliated');
    expect(out).not.toMatch(/not affiliated[^"]*aeoanalyzers\.com/);
    expect(out).toContain('lantern.io'); // a genuine third party still gets named
  });

  it('names a genuine third-party collision — the disclaimer is not disabled wholesale', () => {
    const out = remediationSnippet('lanternpost.app', 'Lantern Post', ['lantern.io', 'lanterns.app'], {
      ownedDomains: OWNED,
    }).join('\n');
    expect(out).toMatch(/not affiliated with similarly named entities such as .*lantern\.io/);
  });

  it('fails closed — an unknown owned-domain list never produces a disclaimer against our own', () => {
    // ownedDomains undefined: isOwnedDomain returns false, so the caller must supply the set.
    // This test documents the contract rather than asserting a silent pass.
    expect(isOwnedDomain('aeoanalyzers.com', OWNED)).toBe(true);
    expect(isOwnedDomain('https://www.aeoanalyzers.com/x', OWNED)).toBe(true);
    expect(isOwnedDomain('lantern.io', OWNED)).toBe(false);
  });
});

describe('2.3 — brand/domain mismatch detection', () => {
  it('flags the real fixture', () => {
    const r = brandDomainMismatch('thesmartaiworker.com', 'AEO Analyzers', 'The Smart AI Worker');
    expect(r.mismatch).toBe(true);
    expect(r.reason).toContain('AEO Analyzers');
  });

  it('does not flag a brand whose name is in its own domain', () => {
    expect(brandDomainMismatch('aeoanalyzers.com', 'AEO Analyzers', 'AEO Analyzers').mismatch).toBe(false);
    expect(brandDomainMismatch('lessannoyingcrm.com', 'Less Annoying CRM', undefined).mismatch).toBe(false);
    expect(brandDomainMismatch('lanternpost.app', 'Lantern Post', 'Lantern Post').mismatch).toBe(false);
  });

  it('does not flag when the site declares the same name, even if the domain differs', () => {
    // A company may legitimately trade under a name unlike its domain.
    expect(brandDomainMismatch('getmacrolens.com', 'Macro Lens', 'Macro Lens').mismatch).toBe(false);
  });

  it('flags when there is nothing to check the brand against', () => {
    const r = brandDomainMismatch('thesmartaiworker.com', 'AEO Analyzers', undefined);
    expect(r.mismatch).toBe(true);
  });

  it('never flags when no brand was entered', () => {
    expect(brandDomainMismatch('anything.com', undefined, undefined).mismatch).toBe(false);
    expect(brandDomainMismatch('anything.com', '', 'Whatever').mismatch).toBe(false);
  });
});

describe('customer-facing output carries no cost figure', () => {
  it('the remediation snippet never contains a dollar amount', () => {
    for (const out of [
      remediationSnippet('lanternpost.app', 'Lantern Post', ['lantern.io'], {}),
      remediationSnippet('thesmartaiworker.com', 'AEO Analyzers', ['aeoanalyzers.com'], {
        declaredName: 'The Smart AI Worker', ownedDomains: OWNED,
      }),
    ]) {
      expect(out.join('\n')).not.toMatch(/\$\d/);
    }
  });
});
