// THE FIRST-PERSON BLANK — WO-AEO-REPORT-INTEGRITY-003 Rev B §2.7.
//
// Found by dogfooding on Sep 8 2026 and detected by nothing, ours or anyone's.
// ChatGPT described the founder as "She is the founder of PI GenAI LLC." The cause was
// not bad data: the page is written entirely in the first person — "I build", "I've
// spent", "I run those checks" — so no third-person pronoun appears anywhere on it, and
// the markup declared no gender. An engine asked who this person is had nothing to read
// and guessed from the name.
//
// **The engine did not get it wrong from bad data. It got it wrong from no data.**
//
// The detection is cheap and the fix is one field, which is what makes it worth
// reporting: a page asserts a Person, states no pronoun in visible copy, and declares no
// gender in markup.
//
// Deliberate constraint on the remediation copy: it states the fact positively and never
// names what engines got wrong. A machine-readable file exists to be quoted, and a line
// like "engines describing him as she are wrong" reads badly if it surfaces in an answer.
// The override value comes from the field, not from the editorial.

export interface PersonIdentityReport {
  /** Did the page assert a person at all? If not, nothing here applies. */
  assertsPerson: boolean;
  /** The person's name, when we could read one. */
  personName: string | null;
  /** Third-person pronouns found in the visible copy. */
  pronounsFound: string[];
  /** Did the Person markup declare a gender? */
  declaresGender: boolean;
  /** True when the page asserts a person, states no pronoun, and declares no gender. */
  firstPersonBlank: boolean;
  /** Customer-facing finding, or null when there is nothing to report. */
  finding: string | null;
  /** Paste-ready remediation, positive assertion only. */
  remediation: string[];
}

const THIRD_PERSON = /\b(he|him|his|she|her|hers|they|them|their|theirs)\b/gi;

function visibleText(html: string): string {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Every JSON-LD object in the page, flattened out of any @graph. */
function jsonLdNodes(html: string): any[] {
  const out: any[] = [];
  for (const m of String(html || '').matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1]);
      for (const blk of Array.isArray(parsed) ? parsed : [parsed]) {
        const nodes = blk && blk['@graph'] ? blk['@graph'] : [blk];
        for (const n of nodes) if (n && typeof n === 'object') out.push(n);
      }
    } catch { /* malformed block — not this check's problem */ }
  }
  return out;
}

export function detectFirstPersonBlank(html: string): PersonIdentityReport {
  const nodes = jsonLdNodes(html);
  const person = nodes.find((n) => {
    const t = n['@type'];
    return t === 'Person' || (Array.isArray(t) && t.includes('Person'));
  });

  // A page can assert a person without a Person node — a byline, an author meta tag.
  const text = visibleText(html);
  const authorMeta = /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)/i.exec(html)?.[1];
  const personName: string | null = person?.name || authorMeta || null;
  const assertsPerson = Boolean(person || authorMeta);

  const pronounsFound = Array.from(new Set((text.match(THIRD_PERSON) || []).map((p) => p.toLowerCase())));
  const declaresGender = Boolean(person && (person.gender || person.Gender));

  const firstPersonBlank = assertsPerson && pronounsFound.length === 0 && !declaresGender;

  if (!firstPersonBlank) {
    return { assertsPerson, personName, pronounsFound, declaresGender, firstPersonBlank: false, finding: null, remediation: [] };
  }

  const who = personName ? `${personName}` : 'a person';
  return {
    assertsPerson,
    personName,
    pronounsFound,
    declaresGender,
    firstPersonBlank: true,
    finding:
      `Your page identifies ${who} but never states a pronoun, and your markup declares no gender. ` +
      `Engines that cannot read it will infer one from the name, and they get this wrong often. ` +
      `Add the field to your Person markup.`,
    remediation: [
      `Add \`gender\` to the Person node in your JSON-LD:`,
      '',
      '```json',
      '{',
      '  "@type": "Person",',
      `  "name": ${JSON.stringify(personName || 'Full Name')},`,
      '  "givenName": "…",',
      '  "familyName": "…",',
      '  "gender": "Male"   // or "Female", or a schema.org GenderType URL',
      '}',
      '```',
      '',
      // Positive assertion only — never a line naming what engines got wrong.
      `Optionally state it plainly in \`llms.txt\` as a positive fact, for example: ` +
        `"${personName || 'Full Name'} is male; he/him." Keep it a statement of fact — a machine-readable ` +
        `file exists to be quoted, so do not write a line about what engines have got wrong.`,
    ],
  };
}
