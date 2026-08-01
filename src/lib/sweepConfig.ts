// WO-SWEEP-POLISH-002 A1/A2 — deterministic guardrails for the URL-first config
// surface. The brand/category/competitor/question guesses come from an LLM
// (SweepDashboard `extractPrompt` / `queryPrompt`); this module is the LLM-free
// backstop that runs over that output before it reaches the user:
//   • lintDefunctNames — rewrite dead product names the model still emits
//     (SearchGPT → ChatGPT search, Bard → Gemini, …) so questions/labels stay
//     current (A2c). One extensible registry.
//   • sanitizeCompetitors — dedupe, drop the client's own brand/domain, drop
//     empty/defunct entries from the guessed competitor seed (A1 guardrail).
//
// NOTE: full "category-native" competitor inference (so an off-category vendor
// like a security tool never gets proposed for an AEO tool) needs either a prior
// sweep's grounded C1 detection or a category knowledge base — logged to the
// FREEZE-REPORT backlog. This module is the small, testable slice: structural
// hygiene + defunct-name lint. Import-safe (client-only; no serverless importers).

/** Dead / renamed product names the models still surface, → their current name.
 *  Word-boundary, case-insensitive. Extend as the vendor landscape churns. */
export const DEFUNCT_NAME_REGISTRY: { rx: RegExp; replacement: string }[] = [
  { rx: /\bSearch\s?GPT\b/gi, replacement: 'ChatGPT search' },
  { rx: /\bGoogle\s+Bard\b/gi, replacement: 'Gemini' },
  { rx: /\bBard\b/gi, replacement: 'Gemini' },
  { rx: /\bBing\s+Chat\b/gi, replacement: 'Copilot' },
  { rx: /\b(?:Google\s+)?SGE\b/gi, replacement: 'Google AI Overviews' },
  { rx: /\bSearch\s+Generative\s+Experience\b/gi, replacement: 'Google AI Overviews' },
];

/** Rewrite any defunct product name in a string to its current name. */
export function lintDefunctNames(text: string): string {
  let out = String(text || '');
  for (const { rx, replacement } of DEFUNCT_NAME_REGISTRY) out = out.replace(rx, replacement);
  // Collapse any double spaces a replacement may have introduced.
  return out.replace(/\s{2,}/g, ' ').trim();
}

/** True if the string still contains a defunct product name (pre-lint check). */
export function hasDefunctName(text: string): boolean {
  return DEFUNCT_NAME_REGISTRY.some(({ rx }) => { rx.lastIndex = 0; return rx.test(String(text || '')); });
}

const alnum = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const domainRoot = (d: string) => alnum(String(d || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('.')[0]);

/**
 * Clean the guessed competitor seed before it reaches the editable field:
 * trim, drop empties, rewrite defunct names, drop the client's OWN brand/domain
 * (a tool should never be listed as its own competitor), and dedupe case-folded.
 * Accepts "Name" or "Name, domain.com" rows; dedupe keys on the leading name.
 */
export function sanitizeCompetitors(
  names: string[],
  opts: { brand?: string; ownDomain?: string } = {}
): string[] {
  const brandKey = alnum(opts.brand || '');
  const ownRoot = domainRoot(opts.ownDomain || '');
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names || []) {
    const name = lintDefunctNames(String(raw || '').trim());
    if (!name) continue;
    const key = alnum(name.split(',')[0]); // "Profound, tryprofound.com" → "profound"
    if (!key) continue;
    if (brandKey && key === brandKey) continue;   // don't list yourself by name
    if (ownRoot && key === ownRoot) continue;      // …or by your own domain root
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}
