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

// ─── Sweep integration (WO-QA-003 B1) ───────────────────────────────────────
// A branded sweep answer isn't just "cited / not cited" — a CITED answer can still
// be WRONG about you (the Claude exec-package conflation, the Jesper-Nissen
// fabrication). Run every branded "cited" transcript through scoreFidelity and
// split "cited" into cited-accurate vs cited-drifted, so Owned Citation Rate isn't
// silently counting drifted answers as clean wins.

export type FidelityState = 'cited-accurate' | 'cited-drifted' | 'not-cited';

export interface RunFidelity {
  state: FidelityState;
  fidelityPct: number;
  issues: FidelityIssue[];
}

/** Classify ONE branded run against the truth record. A cited answer is
 *  `cited-drifted` when it makes a high-severity error (a fabricated founder, etc.),
 *  otherwise `cited-accurate`. Not-cited runs pass straight through. */
export function classifyRunFidelity(cited: boolean, transcript: string, truth: TruthRecord): RunFidelity {
  if (!cited) return { state: 'not-cited', fidelityPct: 0, issues: [] };
  const f = scoreFidelity(transcript, truth);
  const drifted = f.hallucinatedFounders.length > 0 || f.issues.some((i) => i.severity === 'high');
  return { state: drifted ? 'cited-drifted' : 'cited-accurate', fidelityPct: f.fidelityPct, issues: f.issues };
}

export interface FidelitySummary {
  citedAccurate: number;
  citedDrifted: number;
  /** Distinct high-severity issues across all branded cited answers (deduped by
   *  type+wrong value) — the "what AI gets wrong about you" list. */
  issues: FidelityIssue[];
  /** Fabricated founder/creator names any engine asserted. */
  hallucinatedFounders: string[];
}

/** Roll fidelity up across a sweep's branded runs. */
export function summarizeFidelity(
  brandedRuns: { cited?: boolean; transcript: string }[],
  truth: TruthRecord
): FidelitySummary {
  let citedAccurate = 0, citedDrifted = 0;
  const seen = new Set<string>();
  const issues: FidelityIssue[] = [];
  const hallucinated = new Set<string>();
  for (const r of brandedRuns) {
    const f = classifyRunFidelity(!!r.cited, r.transcript || '', truth);
    if (f.state === 'cited-accurate') citedAccurate++;
    else if (f.state === 'cited-drifted') {
      citedDrifted++;
      for (const i of f.issues) {
        if (i.severity !== 'high') continue;
        if (i.wrong) hallucinated.add(i.wrong);
        const key = `${i.type}|${i.wrong || ''}`;
        if (!seen.has(key)) { seen.add(key); issues.push(i); }
      }
    }
  }
  return { citedAccurate, citedDrifted, issues, hallucinatedFounders: [...hallucinated] };
}
