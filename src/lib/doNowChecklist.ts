// WO-AEO-REPORT-POLISH-001 Lane G1 — "This month's authority checklist (Do-now tier)".
//
// The Nybsys 2026-09-30 report told a telecom-hardware maker to get listed on
// sourceforge.net, linkedin.com and trustpilot.com. Every one of those WAS in the sweep's
// stored category sources (7, 4 and 3 citations), so "only list domains from this sweep"
// was already true and was not the defect. The defect was thinner: two of the three came
// from ONE engine on one or two questions, and none carried its receipt, so a directory one
// engine happened to cite read as "the sources engines already trust in your category".
//
// Rule: a Do-now domain must be cited by at least two engines OR at least three times across
// the sweep's category answers, and it is always shown WITH its count and engines so the
// reader can judge it. When nothing qualifies, the report says so instead of a generic list.
import { tierForDomain } from './authorityTiers';

export interface AuthorityLike { domain: string; citations: number; engines?: string[] }

export const NO_DO_NOW = 'No self-serve listings appeared in your sources this month.';

const ENGINE_LABEL: Record<string, string> = { claude: 'Claude', openai: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini' };

export function doNowChecklist(authorityDomains: AuthorityLike[]): string[] {
  return (authorityDomains || [])
    .filter((d) => tierForDomain(d.domain).tier === 'now')
    .filter((d) => (d.engines?.length || 0) >= 2 || d.citations >= 3)
    .sort((a, b) => b.citations - a.citations)
    .slice(0, 6)
    .map((d) => `${d.domain} (${d.citations} citation${d.citations === 1 ? '' : 's'}${d.engines?.length ? ', ' + d.engines.map((e) => ENGINE_LABEL[e] || e).join(' + ') : ''})`);
}
