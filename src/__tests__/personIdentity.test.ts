import { describe, it, expect } from 'vitest';
import { detectFirstPersonBlank } from '../lib/personIdentity';

/** WO-AEO-REPORT-INTEGRITY-003 Rev B §2.7 — the first-person blank.
 *
 *  The fixture is the real Sep 8 2026 case: a page written entirely in the first person,
 *  asserting a Person, with no pronoun in the copy and no gender in the markup. An
 *  engine asked who this person is had nothing to read and guessed from the name. */

const PERSON_NODE = (extra = '') => `
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
 {"@type":"Person","name":"Lindsay Hiebert","jobTitle":"Founder"${extra}}]}
</script>`;

const FIRST_PERSON_COPY = `
<h1>The Smart AI Worker</h1>
<p>I build practical AI applications. I've spent decades in networking and silicon.
I run those checks myself before I ship anything.</p>`;

describe('detects the first-person blank', () => {
  it('flags a page that asserts a person, states no pronoun and declares no gender', () => {
    const r = detectFirstPersonBlank(PERSON_NODE() + FIRST_PERSON_COPY);
    expect(r.assertsPerson).toBe(true);
    expect(r.personName).toBe('Lindsay Hiebert');
    expect(r.pronounsFound).toEqual([]);
    expect(r.declaresGender).toBe(false);
    expect(r.firstPersonBlank).toBe(true);
    expect(r.finding).toContain('never states a pronoun');
    expect(r.finding).toContain('infer one from the name');
  });

  it('does NOT flag once the markup declares a gender — the one-field fix', () => {
    const r = detectFirstPersonBlank(PERSON_NODE(',"gender":"Male"') + FIRST_PERSON_COPY);
    expect(r.declaresGender).toBe(true);
    expect(r.firstPersonBlank).toBe(false);
    expect(r.finding).toBeNull();
  });

  it('does NOT flag a page that uses third-person copy, even without gender markup', () => {
    const r = detectFirstPersonBlank(
      PERSON_NODE() + '<p>Lindsay Hiebert founded the company. He leads product.</p>'
    );
    expect(r.pronounsFound).toContain('he');
    expect(r.firstPersonBlank).toBe(false);
  });

  it('does NOT flag a page that asserts no person at all', () => {
    const r = detectFirstPersonBlank('<h1>Widgets Inc</h1><p>We make widgets.</p>');
    expect(r.assertsPerson).toBe(false);
    expect(r.firstPersonBlank).toBe(false);
    expect(r.finding).toBeNull();
  });

  it('picks up a person asserted only by an author meta tag', () => {
    const r = detectFirstPersonBlank(
      '<meta name="author" content="Jane Doe">' + FIRST_PERSON_COPY
    );
    expect(r.assertsPerson).toBe(true);
    expect(r.personName).toBe('Jane Doe');
    expect(r.firstPersonBlank).toBe(true);
  });

  it('survives malformed JSON-LD without throwing', () => {
    expect(() => detectFirstPersonBlank('<script type="application/ld+json">{ nope </script>')).not.toThrow();
  });
});

describe('the remediation states the fact positively and names no engine error', () => {
  const r = detectFirstPersonBlank(PERSON_NODE() + FIRST_PERSON_COPY);
  const text = r.remediation.join('\n');

  it('gives a paste-ready gender field', () => {
    expect(text).toContain('"gender": "Male"');
    expect(text).toContain('"@type": "Person"');
  });

  it('never generates copy naming what engines got wrong', () => {
    // A machine-readable file exists to be quoted. A line like "engines describing him
    // as she are wrong" reads badly if it surfaces in an answer, and the override value
    // comes from the field rather than the editorial.
    expect(text).not.toMatch(/\bwrong(ly)? (described|called|identified)\b/i);
    expect(text).not.toMatch(/engines (?:have )?(?:got|get) (?:this|it) wrong/i);
    expect(text).not.toMatch(/\bincorrectly\b/i);
    expect(text).toMatch(/is male; he\/him/);
    expect(text).toContain('statement of fact');
  });
});
