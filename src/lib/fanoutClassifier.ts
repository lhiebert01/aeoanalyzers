// WO-AEO-POSITION-AND-PANEL-006 Item E — Search Console fan-out segmentation.
//
// Search Console does not say where a query came from. This module CLASSIFIES each query as likely
// machine-written (an AI system expanding a person's question into searches) or likely typed by a
// person, against a visible rule set, and returns which rules fired and a confidence. It never asserts
// a query's origin: the UI shows the rules, the confidence, and the words "a classification, not a fact".

export interface FanoutRule { id: string; label: string; weight: number; test: (q: string) => boolean }

const words = (q: string) => q.trim().split(/\s+/).filter(Boolean);
export const FANOUT_RULES: FanoutRule[] = [
  { id: 'long-sentence', label: 'A full sentence of 12 or more words', weight: 0.35, test: (q) => words(q).length >= 12 },
  { id: 'imperative', label: 'Starts with an instruction (list, give, provide, return, compare, find, show)', weight: 0.3, test: (q) => /^(?:list|give|provide|return|compare|find|show|identify|summari[sz]e|output|generate)\b/i.test(q.trim()) },
  { id: 'format-instruction', label: 'Asks for an output format (json, no prose, no markdown, table, bullet points)', weight: 0.55, test: (q) => /\b(?:json|no prose|no markdown|without markdown|as a table|in a table|bullet points?|csv format|structured output)\b/i.test(q) },
  { id: 'return-word', label: 'Contains "return"', weight: 0.25, test: (q) => /\breturn\b/i.test(q) },
  { id: 'location-preamble', label: 'Carries a location preamble ("my location is", "user is in")', weight: 0.6, test: (q) => /\b(?:my location is|user (?:is )?(?:located )?in|the user's location)\b/i.test(q) },
  { id: 'competitor-list', label: 'Enumerates three or more named options', weight: 0.4, test: (q) => (q.match(/,/g) || []).length >= 2 && /\b(?:and|or|vs\.?)\b/i.test(q) && words(q).length >= 8 },
  { id: 'over-specified', label: 'Over-specified (four or more qualifiers: year, size, price, region, feature)', weight: 0.3, test: (q) => [/\b20\d\d\b/, /\b(?:small|enterprise|startup|smb|mid-?size)\b/i, /\b(?:price|pricing|cost|cheap|affordable|free)\b/i, /\b(?:usa|us|uk|canada|europe|india|australia|united states)\b/i, /\b(?:with|that (?:has|supports|includes))\b/i, /\b(?:best|top|leading)\b/i].filter((r) => r.test(q)).length >= 4 },
];

export interface FanoutVerdict { likelyMachine: boolean; confidence: number; fired: string[] }
/** Combined as 1 − Π(1 − weight) over the fired rules: two weak signals beat one, none reaches 1. */
export function classifyQuery(q: string): FanoutVerdict {
  const fired = FANOUT_RULES.filter((r) => r.test(q));
  const confidence = Math.round(100 * (1 - fired.reduce((p, r) => p * (1 - r.weight), 1))) / 100;
  return { likelyMachine: confidence >= 0.5, confidence, fired: fired.map((r) => r.id) };
}

export interface GscRow { query: string; clicks: number; impressions: number; ctr?: number; position: number }
export interface Population { queries: number; clicks: number; impressions: number; ctr: number | null; avgPosition: number | null }
function pop(rows: GscRow[]): Population {
  const clicks = rows.reduce((a, r) => a + r.clicks, 0), impressions = rows.reduce((a, r) => a + r.impressions, 0);
  return {
    queries: rows.length, clicks, impressions,
    ctr: impressions ? clicks / impressions : null,
    // average position weighted by impressions, as Search Console reports it
    avgPosition: impressions ? rows.reduce((a, r) => a + r.position * r.impressions, 0) / impressions : null,
  };
}
export function segment(rows: GscRow[]): { blended: Population; likelyPerson: Population; likelyMachine: Population; verdicts: (GscRow & FanoutVerdict)[] } {
  const verdicts = rows.map((r) => ({ ...r, ...classifyQuery(r.query) }));
  return { blended: pop(rows), likelyPerson: pop(verdicts.filter((v) => !v.likelyMachine)), likelyMachine: pop(verdicts.filter((v) => v.likelyMachine)), verdicts };
}

export const FANOUT_LIMITS = [
  'Google only. Nothing here describes ChatGPT, Claude or Perplexity traffic.',
  'Google withholds rare queries for privacy, so part of the long tail is invisible here by construction.',
  'Results depend on what the connected property itself covers.',
  'Search Console does not record where a query came from. Each row is a classification against the rules shown, with a confidence — not a confirmed fact.',
];

/** Parse a Search Console "Queries" CSV export (Top queries, Clicks, Impressions, CTR, Position). */
export function parseGscCsv(text: string): GscRow[] {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const cells = (l: string) => { const out: string[] = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map((c) => c.trim()); };
  const head = cells(lines[0]).map((h) => h.toLowerCase());
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const qi = col(/quer/), ci = col(/^clicks/), ii = col(/^impressions/), pi = col(/^position/);
  if (qi < 0 || ci < 0 || ii < 0 || pi < 0) return [];
  return lines.slice(1).map(cells).filter((c) => c[qi]).map((c) => ({ query: c[qi], clicks: Number(c[ci]) || 0, impressions: Number(c[ii]) || 0, position: Number(c[pi]) || 0 }));
}
