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
  // EFFICACY SUPERLATIVES — added Sep 20 2026. The User Guide claimed schema was
  // "the single most effective way to improve your AEO score", which is both an
  // unqualified superlative AND contradicted by our own published primer: six of
  // seven platforms show no sign of using schema when citing, and a schema-only fact was answered by none.
  // The BANNED list had eleven entries and none of them covered a claim about how
  // well something works, which is the most consequential kind to get wrong.
  { rx: /\b(the\s+)?(single\s+)?most\s+(effective|powerful|important|impactful)\b/i, label: 'efficacy superlative' },
  { rx: /\bfastest way to\b|\bsurest way to\b|\bbest way to (get|be|become) (cited|mentioned|recommended)\b/i, label: 'efficacy superlative (idiom)' },
  // --- comparative-deficiency claims about competitors (added Sep 19 2026) ---
  // Subject AND predicate, same clause. `[^.<]{0,60}` keeps it inside one sentence and
  // stops it leaping an HTML tag boundary into unrelated copy.
  {
    // ANY short modifier may sit between the subject and the noun. The first version
    // allowed only `aeo`/`geo`, so `Most “AEO” or “GEO” tools` was missed, and then so
    // was `Most AI-visibility tools hand you a number and a vibe` — which had been live
    // on /blog/how-it-works the whole time the truth pass reported twelve surfaces
    // cleared. Two misses from the same too-specific middle.
    rx: /\b(most|other|many|plenty of|lots of|a lot of|some|several|rival|competing|legacy|traditional|score-only|keyword-era|the rest of the)\s+(?:[\w“”"'&-]+\s+){0,3}(tools?|platforms?|vendors?|apps?|software|consultants?|products?|services?|providers?|suites?)\b[^.<]{0,60}\b(only|just|merely|never|stop|stops|hand you|hands you|give you|gives you|leave you|leaves you|can'?t|cannot|don'?t|do not|fail to|fails to)\b/i,
    label: 'comparative-deficiency claim about competitors',
  },
  // The bare scaffold: "Most tools: <anything>" as a labelled contrast. Five of the six
  // in the published blog post had no deficiency verb at all — "Most tools: score one
  // engine" — so the predicate rule alone missed them.
  {
    // Up to 24 chars before the colon so a compound subject still matches — the blog
    // shipped "Most tools & consultants:" and a 12-char gap missed it.
    rx: /\b(most|other|plenty of|lots of|some|several|rival|competing|legacy|traditional)\s+(tools?|platforms?|vendors?|consultants?)\b[^.<]{0,24}:/i,
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


// ---------------------------------------------------------------------------------
// WO-AEO-SCHEMA-CLAIM-PRECISION-001 (23 Sep 2026). The primer and a LinkedIn post said
// "six of seven AI platforms cannot read your schema". A reader corrected it publicly and
// was right: GPTBot, ClaudeBot and PerplexityBot fetch the raw HTML, and the JSON-LD is in
// it. "Cannot read" is a claim about the crawler. What the testing supports is a claim
// about citation behaviour: most platforms show no sign of USING the schema when choosing
// what to cite. The precise wording is ratified; the imprecise verbs are banned whenever
// they share a sentence with a schema noun. Text is tag-stripped and split on sentence
// punctuation so the rule cannot fire across two unrelated sentences.

const SCHEMA_NOUN = /\b(schema|structured data|json-?ld|ld\+json|markup)\b/i;
const SCHEMA_BANNED_VERB = /\b(cannot read|can'?t read|can(?:&rsquo;|’)t read|do(?:es)? not read|don'?t read|doesn'?t read|unable to read|invisible to|ignores?)\b/i;

/** Sentences that pair a banned read/ignore verb with a schema noun. Empty = clean. */
export function schemaClaimViolations(text: string): string[] {
  const t = String(text || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  return t.split(/(?<=[.!?])\s+|\n+|\\n|→/)   // real newlines, escaped \n inside source strings, list arrows
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => SCHEMA_NOUN.test(s) && SCHEMA_BANNED_VERB.test(s));
}
