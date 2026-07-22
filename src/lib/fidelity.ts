// WO-2 — Answer-Fidelity scoring. Diffs an engine's answer against the client's
// truth record (truthRecord.ts) and produces the "facts AI gets wrong about you"
// list. No competitor measures this.
//
// The highest-value, fully-deterministic check is FOUNDER MISATTRIBUTION: an
// engine naming a founder/creator who isn't in the client's canonical set (the
// real Jesper-Nissen-vs-AEO-Analyzers failure). We also flag whether the brand
// was identified and which canonical founders were omitted. Grounded string
// analysis — the LLM produced the answer; this module judges it against facts.

import type { TruthRecord } from './truthRecord';

export interface FidelityIssue {
  type: 'hallucinated_founder' | 'omitted_founder' | 'brand_not_identified';
  field: string;
  /** The wrong/asserted value, when applicable. */
  wrong?: string;
  /** The correct value(s) from the truth record. */
  correct?: string[];
  detail: string;
  source: string;
  severity: 'high' | 'medium' | 'low';
}

export interface FidelityScore {
  fidelityPct: number;
  brandIdentified: boolean;
  correctFounders: string[];
  omittedFounders: string[];
  /** Names the engine asserted as founder/creator that are NOT canonical. */
  hallucinatedFounders: string[];
  issues: FidelityIssue[];
}

const NAME = `[A-Z][a-zA-Z.'\\-]+(?:\\s+[A-Z][a-zA-Z.'\\-]+){1,2}`;

/** Pull candidate person names asserted in a founder/creator role from an answer. */
export function extractFounderMentions(text: string): string[] {
  const t = String(text || '');
  const found = new Set<string>();
  // "founded by X", "co-founder X", "created by X", "co-built by X"
  const after = new RegExp(
    `(?:founded (?:and (?:launched|created|built) )?by|co-?founded by|co-?built by|co-?created by|created by|built by|(?:co-?)?founder[s]?(?:\\s+(?:is|are|was|were))?|creator[s]?(?:\\s+(?:is|are))?)\\s+(?:is\\s+|are\\s+)?(${NAME})`,
    'g'
  );
  // "X, the co-founder", "X co-built"
  const before = new RegExp(
    `(${NAME}),?\\s+(?:the\\s+|a\\s+)?(?:co-?)?(?:founder|creator|co-?builder|co-?built|co-?founded)`,
    'g'
  );
  for (const rx of [after, before]) {
    let m: RegExpExecArray | null;
    while ((m = rx.exec(t))) found.add(m[1].trim());
  }
  return [...found];
}

/** Is `mention` the same person as any canonical founder? Matches on full name
 *  (case-insensitive) or a shared surname, so "Hiebert" ≈ "Lindsay Hiebert". */
function matchesCanonical(mention: string, canonical: string[]): boolean {
  const m = mention.toLowerCase().trim();
  const mLast = m.split(/\s+/).pop() || m;
  return canonical.some((c) => {
    const cl = c.toLowerCase().trim();
    if (cl === m || cl.includes(m) || m.includes(cl)) return true;
    const cLast = cl.split(/\s+/).pop() || cl;
    return cLast.length > 2 && cLast === mLast;
  });
}

/** Whole-word presence of a name in the answer. */
function mentioned(text: string, name: string): boolean {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(text);
}

export function scoreFidelity(transcript: string, truth: TruthRecord): FidelityScore {
  const text = String(transcript || '');
  const issues: FidelityIssue[] = [];
  const canonical = truth.founders || [];

  // Founder mentions asserted by the engine.
  const mentions = extractFounderMentions(text);
  const hallucinatedFounders = mentions.filter((m) => canonical.length > 0 && !matchesCanonical(m, canonical));
  const correctFounders = canonical.filter((c) => mentioned(text, c));
  const omittedFounders = canonical.filter((c) => !mentioned(text, c));

  const brandIdentified = !!truth.brandName && mentioned(text, truth.brandName);

  let score = 100;

  for (const wrong of hallucinatedFounders) {
    score -= 35;
    issues.push({
      type: 'hallucinated_founder',
      field: 'founder',
      wrong,
      correct: canonical,
      detail: `The engine names "${wrong}" as a founder/creator, but the canonical founder${canonical.length > 1 ? 's are' : ' is'} ${canonical.join(', ') || '(unknown)'}. This is a fabricated attribution.`,
      source: 'Organization/Person schema (founder, creator) + llms.txt',
      severity: 'high',
    });
  }

  if (canonical.length > 0 && correctFounders.length === 0) {
    score -= 15;
    for (const c of omittedFounders) {
      issues.push({
        type: 'omitted_founder',
        field: 'founder',
        correct: [c],
        detail: `The engine's answer does not mention the canonical founder "${c}".`,
        source: 'Organization/Person schema + llms.txt',
        severity: 'medium',
      });
    }
  }

  if (truth.brandName && !brandIdentified) {
    score -= 10;
    issues.push({
      type: 'brand_not_identified',
      field: 'name',
      correct: [truth.brandName],
      detail: `The answer does not clearly identify the brand "${truth.brandName}".`,
      source: 'og:site_name / Organization schema',
      severity: 'medium',
    });
  }

  return {
    fidelityPct: Math.max(0, Math.min(100, score)),
    brandIdentified,
    correctFounders,
    omittedFounders,
    hallucinatedFounders,
    issues,
  };
}
