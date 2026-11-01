// AEO Score report guards (founder rulings, 1 Nov 2026). Deterministic, LLM-free, and shared
// by the on-screen report, the handoff email and the Word report so all three say the same thing.
//
//   a. Schema: when the site already serves an Organization with an @id, we reference that
//      graph or say nothing needs pasting. No block we emit may carry an Organization whose
//      name or @id conflicts with the site's own.
//   b. Top priorities: an area scoring 8 or more out of 10 is never listed as a priority.
//   c. Rewrite examples never propose naming an AI model or version in the customer's copy.
//   d. Search Console / Bing verification items carry the DNS caveat: the check reads the
//      page, and verification by DNS record or XML file is not visible from it.

import { extractJsonLdNodes } from './truthRecord';

// ---------------------------------------------------------------------------------------
// a. The site's own entity graph
// ---------------------------------------------------------------------------------------

export const SCHEMA_COMPLETE_TEXT = 'Your existing markup is complete; nothing to paste.';

const ORG_TYPE = /\b(Organization|Corporation|LocalBusiness|NGO|EducationalOrganization|GovernmentOrganization|MedicalOrganization|SportsOrganization|Store|ProfessionalService|OnlineBusiness)\b/;

export interface ServedEntity {
  hasOrg: boolean;
  /** The served Organization's @id, when it has one. */
  orgId: string | null;
  orgName: string | null;
  orgType: string | null;
  /** Another node references the Organization by @id: the markup is a linked graph. */
  linked: boolean;
  hasDisambiguation: boolean;
}

const typeOf = (n: any): string => (Array.isArray(n?.['@type']) ? n['@type'].join(' ') : String(n?.['@type'] || ''));

/** Read the Organization the page itself serves in JSON-LD. */
export function servedEntity(html: string): ServedEntity {
  const nodes = extractJsonLdNodes(html);
  const org = nodes.find((n) => ORG_TYPE.test(typeOf(n)));
  const orgId = org?.['@id'] ? String(org['@id']) : null;
  const refs = (v: unknown): boolean => {
    if (!v || typeof v !== 'object') return false;
    if (Array.isArray(v)) return v.some(refs);
    const o = v as Record<string, unknown>;
    if (o['@id'] === orgId && Object.keys(o).length <= 2) return true;
    return Object.values(o).some(refs);
  };
  const linked = !!orgId && nodes.some((n) => n !== org && Object.entries(n || {}).some(([k, v]) => k !== '@id' && refs(v)));
  return {
    hasOrg: !!org,
    orgId,
    orgName: org?.name ? String(org.name) : null,
    orgType: org ? typeOf(org) : null,
    linked,
    hasDisambiguation: !!org?.disambiguatingDescription,
  };
}

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

/** Every Organization in `jsonLd` whose name or @id disagrees with the site's own. Empty when
 *  the site serves no Organization (nothing to conflict with) or the block cannot be parsed. */
export function orgConflicts(jsonLd: string | null | undefined, served: ServedEntity): string[] {
  if (!jsonLd || !served.hasOrg) return [];
  let parsed: any;
  try { parsed = JSON.parse(jsonLd); } catch { return []; }
  const nodes: any[] = [];
  const walk = (v: any) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!v || typeof v !== 'object') return;
    nodes.push(v);
    for (const k of Object.keys(v)) if (k === '@graph' || typeof v[k] === 'object') walk(v[k]);
  };
  walk(parsed);
  const out: string[] = [];
  for (const n of nodes) {
    if (!ORG_TYPE.test(typeOf(n))) continue;
    const id = n['@id'] ? String(n['@id']) : null;
    const sameId = !!id && !!served.orgId && id === served.orgId;
    if (served.orgId && id && id !== served.orgId) out.push(`@id ${id} (the site's is ${served.orgId})`);
    else if (served.orgId && !id) out.push(`an Organization without the site's @id ${served.orgId}`);
    if (n.name && served.orgName && norm(n.name) !== norm(served.orgName) && !sameId) out.push(`name "${n.name}" (the site's is "${served.orgName}")`);
    else if (n.name && served.orgName && norm(n.name) !== norm(served.orgName) && sameId) out.push(`name "${n.name}" on the site's own @id (the site says "${served.orgName}")`);
  }
  return out;
}

// ---------------------------------------------------------------------------------------
// b. Top priorities
// ---------------------------------------------------------------------------------------

/** An area at or above this score (out of 10) is a strength, never a priority. */
export const PRIORITY_THRESHOLD = 8;

export interface CriterionLike { name: string; score: number; feedback: string }
export interface ChecklistLike { category?: string; action: string; priority?: string }

export type TopPriorities =
  | { kind: 'areas'; areas: CriterionLike[] }
  | { kind: 'allStrong'; note: string; checklist: ChecklistLike[] };

export const ALL_STRONG_NOTE = `Every area scores ${PRIORITY_THRESHOLD} or more out of 10, so none is listed as a priority. The top items from your implementation checklist:`;

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function selectTopPriorities(criteria: CriterionLike[] | undefined, checklist: ChecklistLike[] | undefined, max = 3): TopPriorities {
  const weak = (criteria || []).filter((c) => typeof c.score === 'number' && c.score < PRIORITY_THRESHOLD).sort((a, b) => a.score - b.score);
  if (weak.length > 0) return { kind: 'areas', areas: weak.slice(0, max) };
  const items = (checklist || [])
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (PRIORITY_RANK[norm(a.c.priority)] ?? 3) - (PRIORITY_RANK[norm(b.c.priority)] ?? 3) || a.i - b.i)
    .slice(0, max)
    .map((x) => x.c);
  return { kind: 'allStrong', note: ALL_STRONG_NOTE, checklist: items };
}

// ---------------------------------------------------------------------------------------
// c. Rewrites never name an AI model or version
// ---------------------------------------------------------------------------------------

const AI_MODEL = /\b(?:chat\s?gpt|gpt[\s-]?\d[\w.-]*|gpt-?4o|o[134](?:-mini|-pro)?|gemini(?:\s+(?:\d[\w.]*|pro|flash|ultra|nano))*|claude(?:\s+(?:\d[\w.]*|opus|sonnet|haiku|fable))*|llama\s?\d[\w.]*|mistral\s+(?:large|medium|small|\d[\w.]*)|mixtral|grok(?:\s?\d[\w.]*)?|deepseek(?:[\s-](?:v\d[\w.]*|r\d|chat|coder))?|perplexity\s+sonar(?:\s+pro)?)\b/gi;

/** AI model or product-version names in `text`, lower-cased and de-duplicated. */
export function aiModelNames(text: string | null | undefined): string[] {
  return [...new Set((String(text || '').match(AI_MODEL) || []).map((m) => m.toLowerCase().replace(/\s+/g, ' ').trim()))];
}

/** A rewrite proposes naming a model when its proposed text names a model or version that the
 *  customer's current text does not ("Gemini" kept as-is is their word; "Gemini 3.6 Flash" added
 *  is ours). */
export function rewriteNamesAiModel(proposed: string | null | undefined, current?: string | null): boolean {
  const had = new Set(aiModelNames(current));
  return aiModelNames(proposed).some((m) => !had.has(m));
}

export function dropModelNamingRewrites<T extends { proposed: string; current?: string }>(rewrites: T[] | undefined): { kept: T[]; dropped: T[] } {
  const kept: T[] = []; const dropped: T[] = [];
  for (const r of rewrites || []) (rewriteNamesAiModel(r?.proposed, r?.current) ? dropped : kept).push(r);
  return { kept, dropped };
}

// ---------------------------------------------------------------------------------------
// d. Search Console / Bing verification items
// ---------------------------------------------------------------------------------------

export const VERIFY_CAVEAT = 'If not already verified (DNS verification is not visible to this check).';

const VERIFY_ITEM = /\b(verif(?:y|ied|ication)|claim)\b[\s\S]{0,80}\b(search console|bing webmaster|webmaster tools)\b|\b(search console|bing webmaster|webmaster tools)\b[\s\S]{0,80}\bverif(?:y|ied|ication)\b/i;

export function isVerificationItem(text: string | null | undefined): boolean {
  return VERIFY_ITEM.test(String(text || ''));
}

/** Lead a verification item with the caveat, once. Other text passes through unchanged. */
export function qualifyVerificationItem(text: string): string {
  const t = String(text || '');
  if (!isVerificationItem(t) || t.includes(VERIFY_CAVEAT)) return t;
  return `${VERIFY_CAVEAT} ${t}`;
}
