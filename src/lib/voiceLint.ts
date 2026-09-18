// Measurement-honesty voice guard. The brand rule forbids unqualified superlatives
// and absolute brags in user-facing copy ("head and shoulders", "no other tool",
// "world-class", guarantees).
//
// SEP 19 2026 — THE DOCTRINE LINE HERE WAS THE ROOT CAUSE, so it is recorded rather
// than quietly replaced. It used to read:
//
//   "SCOPED comparatives are fine — 'most tools grade you in isolation' is an allowed
//    factual contrast, not a brag about us."
//
// That permission is why the linter never fired on the motif, and the motif reached
// twelve surfaces: the hero window, two FAQs, a comparison card, seven lines in a
// published blog post, and the reasoning comments of the two modules that compute
// fidelity and PAWC.
//
// A scoped comparative is not a brag about us. It is an UNSOURCED CLAIM ABOUT SOMEBODY
// ELSE, which is the harder one to defend: "most tools only give you a score" does not
// survive one competitor who ships rewrites, monitoring and corrections, and Lilypath
// does. Saying what we do needs no claim about what anyone else does not.
//
// So comparative-deficiency claims are now banned alongside the absolutes. The pattern
// requires a COMPETITOR SUBJECT and a DEFICIENCY PREDICATE in the same clause — a bare
// keyword scan ran at 6 true hits in 19 and would have been switched off in a week.
// "You walk away with a scorecard" and "a Citation Sweep doesn't end at a score" are
// about the reader and about us; neither may fire.

const BANNED: { rx: RegExp; label: string }[] = [
  { rx: /head and shoulders/i, label: 'head and shoulders' },
  { rx: /\bno other (tool|platform|product|company)\b/i, label: 'no other tool/platform' },
  { rx: /\buniversal signals\b/i, label: 'universal signals (unknowable-algorithm claim)' },
  { rx: /world[-\s]?class/i, label: 'world-class' },
  { rx: /\bunbeatable\b/i, label: 'unbeatable' },
  { rx: /second to none/i, label: 'second to none' },
  { rx: /best[-\s]in[-\s]class/i, label: 'best-in-class' },
  { rx: /\bbar none\b/i, label: 'bar none' },
  { rx: /the only (tool|platform) that\b/i, label: 'the only tool that' },
  { rx: /hands down/i, label: 'hands down' },
  { rx: /\bwe guarantee\b/i, label: 'we guarantee' },
  { rx: /guaranteed results/i, label: 'guaranteed results' },
  // --- comparative-deficiency claims about competitors (added Sep 19 2026) ---
  // Subject AND predicate, same clause. `[^.<]{0,60}` keeps it inside one sentence and
  // stops it leaping an HTML tag boundary into unrelated copy.
  {
    // The category words between subject and noun may be quoted and alternated —
    // `Most “AEO” or “GEO” tools` shipped in the blog and the first pattern missed it.
    rx: /\b(most|other|many|rival|competing)\s+(?:["“”']?(?:aeo|geo)["“”']?\s*(?:or\s+)?){0,2}(tools?|platforms?|vendors?|apps?|software|consultants?)\b[^.<]{0,60}\b(only|just|merely|never|stop|stops|hand you|hands you|give you|gives you|leave you|leaves you|can'?t|cannot|don'?t|do not|fail to|fails to)\b/i,
    label: 'comparative-deficiency claim about competitors',
  },
  // The bare scaffold: "Most tools: <anything>" as a labelled contrast. Five of the six
  // in the published blog post had no deficiency verb at all — "Most tools: score one
  // engine" — so the predicate rule alone missed them.
  {
    // Up to 24 chars before the colon so a compound subject still matches — the blog
    // shipped "Most tools & consultants:" and a 12-char gap missed it.
    rx: /\b(most|other|rival|competing)\s+(tools?|platforms?|vendors?|consultants?)\b[^.<]{0,24}:/i,
    label: 'competitor contrast scaffold ("Most tools: …")',
  },
];

/** Return the banned absolute/superlative phrases present in `text` (empty = clean).
 *  Note: a NEGATED use ("no guarantees of rankings") is fine — the patterns target
 *  the promissory forms only. */
export function bannedAbsolutes(text: string): string[] {
  const t = String(text || '');
  return BANNED.filter((b) => b.rx.test(t)).map((b) => b.label);
}
