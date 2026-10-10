// WO-AEO-POSITION-AND-PANEL-006 Item D — which buyer intent a question carries.
//   shortlist    "best X", "top X", "which vendors sell X" — the buyer wants names
//   problem      "how do I fix …", "why isn't …" — the buyer describes a situation
//   alternatives "alternatives to Y", "Y competitors" — the buyer already has a name to replace
//   comparison   "Y vs Z", "difference between …" — the buyer is choosing between named options
//   constraint   a shortlist with a hard requirement: price, size, segment, compliance
// Deterministic and visible: the rule that fired is returned with the tag. Precedence runs from the
// most specific purchase signal to the least, so "affordable alternatives to Y" is alternatives.
export type Intent = 'shortlist' | 'problem' | 'alternatives' | 'comparison' | 'constraint';
export const INTENTS: Intent[] = ['shortlist', 'constraint', 'alternatives', 'comparison', 'problem'];
export const INTENT_LABEL: Record<Intent, string> = { shortlist: 'Shortlist', problem: 'Problem', alternatives: 'Alternatives', comparison: 'Comparison', constraint: 'Constraint' };

const RULES: { intent: Intent; re: RegExp; rule: string }[] = [
  { intent: 'comparison', re: /\b(?:vs\.?|versus|compared? (?:to|with)|comparison|difference(?:s)? between)\b|\bor\b.+\bwhich\b/i, rule: 'names two options to choose between' },
  { intent: 'alternatives', re: /\b(?:alternatives?|competitors?|instead of|replacement for|similar to|switch(?:ing)? from)\b/i, rule: 'asks to replace a named option' },
  { intent: 'problem', re: /^(?:how (?:do|can|to|should)|why (?:is|isn'?t|does|doesn'?t|are)|what (?:causes|should i do))\b|\b(?:fix|troubleshoot|dead zones?|not working|struggl\w*|problem)\b/i, rule: 'describes a situation rather than asking for names' },
  { intent: 'constraint', re: /\b(?:affordable|cheap(?:est)?|budget|free|low(?:er)?[- ]cost|under \$?\d|for (?:an? )?(?:small |large |growing |remote )?(?:business(?:es)?|startups?|smbs?|solopreneurs|freelancers|enterprises?|hospitals?|teams?|agenc(?:y|ies))|small business|hipaa|soc ?2|compliant|on-?prem)\b/i, rule: 'adds a hard requirement (price, size, segment or compliance)' },
];

/** `category` = the sweep's category noun. A requirement that is part of the category itself
 *  ("simple CRM for small business") is not a constraint the QUESTION adds, so the constraint rule
 *  is tested only on what the question says beyond the noun. */
export function classifyIntent(question: string, category?: string | null): { intent: Intent; rule: string } {
  const beyond = category ? question.replace(new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ') : question;
  for (const r of RULES) if (r.re.test(r.intent === 'constraint' ? beyond : question)) return { intent: r.intent, rule: r.rule };
  return { intent: 'shortlist', rule: 'asks for names in a category' };
}

export function intentMix(questions: string[], category?: string | null): Record<Intent, number> {
  const out = { shortlist: 0, problem: 0, alternatives: 0, comparison: 0, constraint: 0 } as Record<Intent, number>;
  for (const q of questions) out[classifyIntent(q, category).intent]++;
  return out;
}

export function intentMixLine(questions: string[], category?: string | null): string {
  const m = intentMix(questions, category);
  return `Question mix: ${INTENTS.filter((i) => m[i]).map((i) => `${m[i]} ${INTENT_LABEL[i].toLowerCase()}`).join(' · ')} (of ${questions.length}).`;
}
