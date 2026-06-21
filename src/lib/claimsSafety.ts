// Grounded-only claims safety — the durable backstop (runbook FIX 3).
//
// The analyzer's *detection* is trusted; its value *generation* is not. This
// module guarantees, in code, that nothing the report emits as DATA contains a
// number, rating, or review count that does not actually appear on the analyzed
// page. Inferred *structure* (schema types, headings, "add an FAQ") is fine;
// inferred *values* (ratings, counts, prices, pass rates, percentages,
// guarantees, outcomes) are never rendered as data — in any section, including
// "candidate" blocks. A "verify before pasting" label is not enough; people
// paste anyway.
//
// Core principle: the tool may re-express what is actually on the page more
// citably; it may never manufacture a fact, rating, statistic, percentage, pass
// rate, guarantee, or outcome that the page does not contain.
//
// This runs over the assembled report inside applyAccuracyGuards, right before
// it reaches the UI / DOCX / handoff-email renderers.

/** Strip HTML to a plain-text haystack we can test claim numbers against. */
export function extractPageText(html: string): string {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_m, d) => {
      const n = Number(d);
      return Number.isFinite(n) ? String.fromCharCode(n) : ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

// A "claim number": an integer or decimal, optionally thousands-separated or a
// percentage. Catches ratings (4.9), counts (120 / 1,200), pass rates (70%).
const NUMBER_RX = /\d[\d,]*(?:\.\d+)?/g;

/** Numeric claim tokens present in a string. */
export function claimNumbers(text: string | number | null | undefined): string[] {
  return String(text ?? '').match(NUMBER_RX) ?? [];
}

const onlyDigits = (s: string): string => String(s ?? '').replace(/[^\d.]/g, '');

/**
 * Is a numeric claim token supported by any of the provided haystacks (the page
 * text, and — for rewrites — the original source phrase)? Comparison is on the
 * digit sequence so "1,200" matches "1200". Deliberately permissive (substring,
 * like the runbook's pageText.includes(n)): better to let a borderline real
 * number through than to strip a value the page genuinely contains.
 */
export function isGrounded(num: string, ...haystacks: (string | null | undefined)[]): boolean {
  const target = onlyDigits(num);
  if (!target) return true; // nothing numeric to ground
  return haystacks.some((h) => onlyDigits(String(h ?? '')).includes(target));
}

// Non-numeric claims a generator must never invent into emitted copy: explicit
// guarantees, regulatory/credential assertions, and competitive superlatives
// stated as fact. (Pass rates / percentages are already caught as numbers.)
const UNVERIFIABLE_CLAIM_RX =
  /\b(guarantee[ds]?|pass[\s-]?rate|success[\s-]?rate|certified|accredited|fda[\s-]?approved|clinically[\s-]?proven|award[\s-]?winning|#\s?1\b|number[\s-]?one|industry[\s-]?leading|best[\s-]?in[\s-]?class)\b/i;

/** Strip ungrounded claim numbers from free text (e.g. a meta-description rewrite). */
export function stripUngroundedNumbers(
  text: string,
  ...haystacks: (string | null | undefined)[]
): { text: string; removed: string[] } {
  const removed: string[] = [];
  const out = String(text ?? '')
    .replace(NUMBER_RX, (m) => {
      if (isGrounded(m, ...haystacks)) return m;
      removed.push(m);
      return '';
    })
    // tidy the holes left behind ("serves  customers" / "up to %")
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:%)])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .trim();
  return { text: out, removed };
}

// JSON-LD keys that ARE a fabricated-rating construct. A generated schema must
// never carry these unless every number inside them is grounded on the page.
const RATING_REVIEW_KEY_RX = /^(aggregateRating|review|reviews)$/i;
// JSON-LD keys whose *value* is a numeric claim (price, counts, dates, ratings).
const NUMERIC_CLAIM_KEY_RX =
  /(rating|review|price|amount|count|quantity|employ|founded|foundingDate|year|duration|numberof)/i;

interface StripRecord {
  field: string;
  reason: string;
}

function allNumbersGrounded(value: unknown, pageText: string): boolean {
  const nums = claimNumbers(JSON.stringify(value ?? ''));
  return nums.every((n) => isGrounded(n, pageText));
}

/**
 * Recursively remove ungrounded numeric data from a parsed JSON-LD object:
 *  - aggregateRating / review nodes whose numbers are not on the page (the
 *    headline defect: a fabricated 4.9 / 120-review block);
 *  - any numeric-claim field (price, *Count, foundingDate, …) whose value is a
 *    number the page does not contain.
 * Structure and non-numeric values are left untouched.
 */
function sanitizeSchemaNode(node: any, pageText: string, stripped: StripRecord[]): any {
  if (Array.isArray(node)) {
    return node.map((n) => sanitizeSchemaNode(n, pageText, stripped));
  }
  if (!node || typeof node !== 'object') return node;

  for (const key of Object.keys(node)) {
    const value = node[key];

    if (RATING_REVIEW_KEY_RX.test(key)) {
      // Trusted only if the page actually shows these review numbers.
      if (!allNumbersGrounded(value, pageText)) {
        delete node[key];
        stripped.push({
          field: key,
          reason: 'rating/review not detected on the page — refusing to emit a fabricated value',
        });
        continue;
      }
    }

    if (
      NUMERIC_CLAIM_KEY_RX.test(key) &&
      (typeof value === 'string' || typeof value === 'number')
    ) {
      const ungrounded = claimNumbers(value).filter((n) => !isGrounded(n, pageText));
      if (ungrounded.length > 0) {
        delete node[key];
        stripped.push({
          field: key,
          reason: `value "${value}" not detected on the page`,
        });
        continue;
      }
    }

    node[key] = sanitizeSchemaNode(value, pageText, stripped);
  }
  return node;
}

/**
 * Sanitize a JSON-LD string. Returns the cleaned string (re-serialized when it
 * parsed) plus what was stripped. On unparseable input, falls back to a textual
 * removal of obvious aggregateRating/review blocks so a fabricated rating never
 * survives even malformed model output.
 */
export function sanitizeSchemaBlock(
  schemaStr: string | undefined,
  pageText: string
): { schema: string; stripped: StripRecord[] } {
  if (!schemaStr || !schemaStr.trim()) return { schema: schemaStr ?? '', stripped: [] };
  const stripped: StripRecord[] = [];
  try {
    const parsed = JSON.parse(schemaStr);
    const clean = sanitizeSchemaNode(parsed, pageText, stripped);
    return { schema: JSON.stringify(clean, null, 2), stripped };
  } catch {
    // Best-effort textual scrub for non-JSON / fenced output.
    let out = schemaStr;
    if (/"(aggregateRating|review)"\s*:/i.test(out)) {
      out = out
        .replace(/,?\s*"aggregateRating"\s*:\s*\{[^{}]*\}/gi, '')
        .replace(/,?\s*"review"\s*:\s*\[[\s\S]*?\]/gi, '');
      stripped.push({
        field: 'aggregateRating/review',
        reason: 'fabricated rating block removed from unparseable schema',
      });
    }
    return { schema: out, stripped };
  }
}

export interface RewriteLike {
  current: string;
  proposed: string;
  page: string;
}

/**
 * Drop any rewrite whose "proposed" text introduces a number or unverifiable
 * claim that is NOT present in the source page (or in the original phrase being
 * rewritten). A rewrite may re-express what is on the page; it may never invent
 * a new metric, percentage, pass rate, guarantee, or outcome.
 */
export function sanitizeRewrites(
  rewrites: RewriteLike[] | undefined,
  pageText: string
): { kept: RewriteLike[]; dropped: { rewrite: RewriteLike; reason: string }[] } {
  const kept: RewriteLike[] = [];
  const dropped: { rewrite: RewriteLike; reason: string }[] = [];
  for (const rw of rewrites ?? []) {
    const ungroundedNums = claimNumbers(rw.proposed).filter(
      (n) => !isGrounded(n, pageText, rw.current)
    );
    const invents =
      UNVERIFIABLE_CLAIM_RX.test(rw.proposed) &&
      !UNVERIFIABLE_CLAIM_RX.test(rw.current) &&
      !UNVERIFIABLE_CLAIM_RX.test(pageText);

    if (ungroundedNums.length > 0) {
      dropped.push({ rewrite: rw, reason: `introduces ungrounded number(s): ${ungroundedNums.join(', ')}` });
    } else if (invents) {
      dropped.push({ rewrite: rw, reason: 'introduces an unverifiable claim (guarantee/credential/superlative) not on the page' });
    } else {
      kept.push(rw);
    }
  }
  return { kept, dropped };
}

// Checklist / recommendation items that tell the site to ADD metrics, ratings,
// or reviews unconditionally — which invites the user to publish fabricated
// data. We reframe these to be conditional on real, substantiated data.
const ADD_METRIC_INSTRUCTION_RX =
  /\b(add|include|insert|display|show|feature|publish|surface|incorporate|provide|list)\b[^.]*\b(statistics?|stats|ratings?|reviews?|star[\s-]?ratings?|testimonials?|pass[\s-]?rates?|success[\s-]?rates?|percentages?|scores?|metrics?|number of (?:users|customers|students|clients|members))\b/i;
const ALREADY_CONDITIONAL_RX = /\b(if you|once you|verifiable|substantiat|real,|only if|provided you|where you can)\b/i;

const CONDITIONAL_PREFIX = 'Only if you can substantiate it with real, verifiable data: ';

/**
 * Reframe an instruction so it never tells a site to publish numbers it cannot
 * prove. Returns the (possibly) rewritten text and whether it changed.
 */
export function conditionalizeMetricInstruction(text: string): { text: string; changed: boolean } {
  const s = String(text ?? '');
  if (!ADD_METRIC_INSTRUCTION_RX.test(s) || ALREADY_CONDITIONAL_RX.test(s)) {
    return { text: s, changed: false };
  }
  const reframed = CONDITIONAL_PREFIX + s.charAt(0).toLowerCase() + s.slice(1);
  return { text: reframed, changed: true };
}
