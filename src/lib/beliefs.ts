// WO-AEO-REPORT-POLISH-001 Lane B — "What the engines believe about you".
//
// The fidelity classifier checks two facts (founder, brand name) against the customer's own
// site. Everything else the eight branded answers assert — headquarters, founding year,
// product lines, market segments, a parent company — went unreported, so a customer could
// not see that four engines agree they are in San Jose while one says they were founded in
// 2006 and nobody else mentions a year.
//
// This module SPLITS the branded transcripts into claims and COUNTS agreement. It does not
// judge truth: a status is Consistent (two or more engines said the same thing),
// Single-source (one engine said it) or Conflicts (engines gave different values for the
// same one-valued fact). "Correct" or "wrong" appears only when the fidelity classifier
// already said so about that exact value (passed in as `flaggedWrong`). Deterministic,
// LLM-free, recomputed from stored runs so a saved view shows the same table as the day the
// sweep ran — and old sweeps get it too. (The order asked for full_result.beliefs; a stored
// copy of a deterministic function of already-stored runs would only go stale, so the
// table is derived, not persisted.)

/** The values the fidelity classifier already judged wrong — the ONLY source of "wrong" here. */
export function flaggedWrongValues(fidelity: { issues?: { type?: string; wrong?: string }[] } | null | undefined): string[] {
  return (fidelity?.issues || []).filter((i) => i.type === 'hallucinated_founder' && i.wrong).map((i) => i.wrong as string);
}

export type BeliefField = 'Legal / brand name' | 'Headquarters' | 'Founder / CEO' | 'Founded' | 'Product line' | 'Segment' | 'Parent company';
export type BeliefStatus = 'Consistent' | 'Single-source' | 'Conflicts' | 'Contradicts your site';

export interface BeliefRow {
  field: BeliefField;
  claim: string;
  /** Engine ids that asserted it, de-duplicated, in stable order. */
  saidBy: string[];
  /** Number of branded answers that asserted it. */
  times: number;
  status: BeliefStatus;
}

interface RunLike { engine: string; queryType?: string; transcript?: string | null; cited?: boolean; domainCited?: boolean; error?: string | null }

const ENGINE_ORDER = ['claude', 'openai', 'perplexity', 'gemini'];
export const ENGINE_LABEL: Record<string, string> = { claude: 'Claude', openai: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini' };

const clean = (s: string) => s.replace(/\*\*|__|\[\d+\]|\(\d+\)/g, '').replace(/\s+/g, ' ').trim();
const norm = (s: string) => clean(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const cap = (s: string) => s.replace(/\s*[,;:(]?\s*$/, '').trim();

/** One-valued facts: the same fact should have one value. */
const SCALAR: Record<string, RegExp[]> = {
  Headquarters: [
    /\b(?:headquartered|based|located)\s+in\s+(?:the\s+)?[A-Z][A-Za-z ]*?\(([^)]+)\)/i,
    /\b(?:headquartered|based|located)\s+in\s+([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*(?:,\s*[A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*)?)/i,
    /\b([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)?)-based\b/,
  ],
  'Founder / CEO': [
    // Name tokens carry no period, so "Jon Ferrara. Its" stops at the surname (Nimble, Oct 8 2026).
    /\b(?:CEO(?: and| &)? founder|founder(?: and| &)? CEO|founded by|founder|CEO|chief executive(?: officer)?)\s*(?:,|is|:)?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\b/,
    /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\s+(?:as|is|,)?\s*(?:its\s+|the\s+)?(?:founder(?: and| &)? CEO|CEO(?: and| &)? founder|CEO|founder)\b/,
  ],
  Founded: [/\b(?:founded|established|incorporated)\s+in\s+((?:19|20)\d\d)\b/i, /\bsince\s+((?:19|20)\d\d)\b/i],
  'Parent company': [/\b(?:a\s+)?(?:subsidiary|division|unit)\s+of\s+([A-Z][\w&.-]*(?:\s[A-Z][\w&.-]*){0,3})/, /\b(?:owned|acquired)\s+by\s+([A-Z][\w&.-]*(?:\s[A-Z][\w&.-]*){0,3})/],
};

/** List facts: several values per answer are normal; we count each item. */
const LIST: Record<string, RegExp[]> = {
  'Product line': [
    /\b(?:specializ(?:es|ing)\s+in|provides?|offers?|delivers?|develops?|builds?|manufactur(?:es|ing)|focus(?:es|ed)\s+on)\s+((?:[^.;:]|\.\d)+?)(?=\s+(?:for|to|across|that|which|serving)\b|[.;:]|$)/gi,
  ],
  Segment: [/\b(?:for|serving|to)\s+((?:enterprises?|operators?|carriers?|hospitals?|healthcare|manufacturers?|manufacturing|utilities|governments?|public safety|campuses|universities|stadiums?|venues|warehouses?|logistics|mining|ports?|airports?|railways?|smart cities|industrial(?: IoT| automation)?|retail|education|military|defen[cs]e)(?:(?:,\s+and|,|\s+and|\s+&)\s+(?:enterprises?|operators?|carriers?|hospitals?|healthcare|manufacturers?|manufacturing|utilities|governments?|public safety|campuses|universities|stadiums?|venues|warehouses?|logistics|mining|ports?|airports?|railways?|smart cities|industrial(?: IoT| automation)?|retail|education|military|defen[cs]e))*)/gi],
};

const LIST_STOP = /^(?:a|an|the|its|their|and|solutions?|services?|products?|technolog(?:y|ies)|companies|company|core|wireless|networking|telecommunications|connectivity|hardware|software|infrastructure|networks?)$/i;
const LIST_LEAD = /^(?:with|spanning|including|across|from|through|via|by|on|at|of|in|to|for|as)\b/i;
/** A product line is a noun phrase. A fragment with a pronoun, a verb of use, an adverb or a
 *  dash is a clause the splitter cut out of a sentence ("manage their contacts effectively",
 *  "pipeline automation—all in one simple"; Nimble, Oct 8 2026). */
const CLAUSE = /\b(?:their|your|its|our|they|you|we|manage|manages|helps?|lets?|allows?|makes?|keeps?|track|effectively|easily|simply|seamlessly|all in one|all-in-one)\b|[—–]|\b\w+ly\b/i;
const GENERIC_ITEM = /^(?:relationships?|contacts?|data|features?|insights?|workflows?|integrations?|automation|management|intelligence)$/i;
/** Merge key for list items: "private 5G networks", "private-5G" and "private 5G" are one product line. */
function itemKey(s: string): string {
  return norm(s).replace(/\b(?:networks?|infrastructure|solutions?|platforms?|systems?|connectivity|technolog(?:y|ies)|services?|products?|offerings?|hardware|software)\b/g, ' ')
    .replace(/(\w)s\b/g, '$1').replace(/\s+/g, ' ').trim();
}

function splitItems(phrase: string): string[] {
  return clean(phrase)
    .replace(/\b(?:including|such as|like)\b/gi, ',')
    .split(/,|\band\b|&|\bplus\b|\//)
    .map((x) => cap(x.replace(/^\s*(?:a|an|the|its|their|advanced|comprehensive|end-to-end|full)\s+/i, '')).replace(/\s+(?:solutions?|services?|platforms?|systems?|technolog(?:y|ies)|products?|offerings?)$/i, ''))
    .map((x) => x.trim())
    .filter((x) => x.length >= 3 && x.length <= 48 && !LIST_STOP.test(x) && !LIST_LEAD.test(x) && !CLAUSE.test(x) && !GENERIC_ITEM.test(x) && /[a-z]/i.test(x));
}

function nameVariants(brand: string | undefined, text: string): string[] {
  if (!brand) return [];
  const b = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const out: string[] = [];
  const legal = text.match(new RegExp(`\\b(${b},?\\s+(?:Inc\\.?|LLC|Ltd\\.?|Limited|Corp\\.?|Corporation|GmbH|Co\\.?|Technologies|Networks|Systems|Labs))\\b`, 'i'));
  if (legal) out.push(clean(legal[1]));
  const aka = text.match(new RegExp(`\\b(?:also known as|formerly(?: known as)?|doing business as|d/b/a|aka)\\s+((?:[A-Z][\\w.&-]*\\s?){1,4})`, ''));
  if (aka) out.push(cap(clean(aka[1])));
  return out;
}

/** Same scalar value? Exact after normalisation, or one contains the other ("San Jose, California" vs "Silicon Valley (San Jose, California)"). */
function sameValue(a: string, b: string): boolean {
  const x = norm(a), y = norm(b);
  return x === y || (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x)));
}

export function extractBeliefs(runs: RunLike[], brand?: string, flaggedWrong: string[] = []): BeliefRow[] {
  const branded = runs.filter((r) => (r.queryType ?? 'branded') === 'branded' && !r.error && (r.transcript || '').trim());
  // field -> claim -> { engines, times }
  const acc = new Map<BeliefField, Map<string, { claim: string; engines: Set<string>; times: number }>>();
  const add = (field: BeliefField, raw: string, engine: string, mergeScalar: boolean) => {
    const claim = cap(clean(raw));
    if (!claim) return;
    const m = acc.get(field) ?? new Map();
    acc.set(field, m);
    let key = mergeScalar ? norm(claim) : itemKey(claim);
    if (!key) return;
    if (mergeScalar) for (const k of m.keys()) if (sameValue(k, key)) { key = k; break; }
    const cur = m.get(key) ?? { claim, engines: new Set<string>(), times: 0 };
    // scalars keep the longer, more specific wording; list items keep the shortest
    if (mergeScalar ? claim.length > cur.claim.length : claim.length < cur.claim.length) cur.claim = claim;
    cur.engines.add(engine); cur.times += 1; m.set(key, cur);
  };

  for (const r of branded) {
    const text = clean(r.transcript || '');
    const seen = new Set<string>(); // one count per field per answer for scalars
    for (const [field, pats] of Object.entries(SCALAR) as [BeliefField, RegExp[]][]) {
      for (const p of pats) {
        const m = text.match(p);
        if (m && m[1] && !seen.has(field)) { add(field, m[1], r.engine, true); seen.add(field); break; }
      }
    }
    for (const v of nameVariants(brand, text)) if (!seen.has('Legal / brand name')) { add('Legal / brand name', v, r.engine, true); seen.add('Legal / brand name'); }
    for (const [field, pats] of Object.entries(LIST) as [BeliefField, RegExp[]][]) {
      const items = new Set<string>();
      for (const p of pats) for (const m of text.matchAll(p)) for (const it of splitItems(m[1])) items.add(it);
      for (const it of items) add(field, it, r.engine, false);
    }
  }

  const rows: BeliefRow[] = [];
  const wrong = new Set(flaggedWrong.map(norm));
  for (const [field, m] of acc) {
    const scalar = field in SCALAR || field === 'Legal / brand name';
    const conflicts = scalar && m.size >= 2;
    for (const { claim, engines, times } of m.values()) {
      const saidBy = ENGINE_ORDER.filter((e) => engines.has(e)).concat([...engines].filter((e) => !ENGINE_ORDER.includes(e)));
      let status: BeliefStatus = wrong.has(norm(claim)) ? 'Contradicts your site' : conflicts ? 'Conflicts' : saidBy.length >= 2 ? 'Consistent' : 'Single-source';
      rows.push({ field, claim, saidBy, times, status });
    }
  }
  const FIELD_ORDER: BeliefField[] = ['Legal / brand name', 'Headquarters', 'Founder / CEO', 'Founded', 'Parent company', 'Product line', 'Segment'];
  rows.sort((a, b) => FIELD_ORDER.indexOf(a.field) - FIELD_ORDER.indexOf(b.field) || b.times - a.times || a.claim.localeCompare(b.claim));
  // List fields: every consistent item, then single-source items up to a cap of 12 per field.
  const perField = new Map<BeliefField, number>();
  return rows.filter((r) => {
    if (r.field in SCALAR || r.field === 'Legal / brand name') return true;
    if (r.status !== 'Single-source') return true;
    const n = (perField.get(r.field) || 0) + 1; perField.set(r.field, n);
    return n <= 12;
  });
}

/** Markdown table shared by the dashboard and the exec report so the two documents agree. */
export function beliefsMarkdown(rows: BeliefRow[], brandedAnswers: number, heading: '##' | '###' = '##'): string[] {
  if (!rows.length) return [];
  const out = [`${heading} What the engines believe about you`];
  out.push(`Every factual claim the ${brandedAnswers} branded answers made, counted. *Consistent* = two or more engines said it; *Single-source* = one engine; *Conflicts* = engines gave different values for the same fact. This table reports agreement, not truth — check a *Conflicts* or *Single-source* row against your own site.`);
  out.push('| Claim | Said by | Times | Status |'); out.push('|---|---|---|---|');
  for (const r of rows.slice(0, 40)) out.push(`| **${r.field}:** ${r.claim} | ${r.saidBy.map((e) => ENGINE_LABEL[e] || e).join(', ')} | ${r.times} | ${r.status} |`);
  out.push('');
  return out;
}
