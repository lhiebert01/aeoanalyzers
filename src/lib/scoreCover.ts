// WO-AEO-REPORT-POLISH-001 Lane C — the AEO Score report's cover inputs, from the stored
// AnalysisResult only. Same CoverInput shape as the Sweep (lib/reportCover.ts) so the two
// reports look like siblings. Every number here traces to a field on the result.
import type { AnalysisResult } from '../services/geminiService';
import { scoreMeaning, weakestDimension, DIMENSION_LABEL, scoreTier, type CoverInput } from './reportCover';

const WEIGHT: Record<'entity' | 'density' | 'clarity' | 'structure', string> = { entity: '30% of score', density: '30% of score', clarity: '20% of score', structure: '20% of score' };

export function buildScoreCover(result: AnalysisResult, analyzedUrl: string, preparedBy: string, date: string): CoverInput {
  const domain = (() => { try { return new URL(analyzedUrl.startsWith('http') ? analyzedUrl : `https://${analyzedUrl}`).hostname; } catch { return analyzedUrl; } })();
  const weak = weakestDimension(result.scoreBreakdown);
  const weakestCriterion = [...result.criteria].sort((a, b) => a.score - b.score)[0] || null;
  const critical = !!result.crawlerAccess?.criticalBlock;
  const headlines = [
    { plain: 'How citable your site is', precise: `AEO Score — ${scoreTier(result.score)} range`, value: `${result.score}/100`, note: critical ? 'capped: a citation-critical crawler is blocked' : undefined },
    { plain: 'Chance a page like this gets cited', precise: 'Citation Readiness — technical estimate, not a measured rate', value: `${result.citationProbability}%` },
    weak
      ? { plain: 'Weakest dimension', precise: DIMENSION_LABEL[weak.key], value: `${weak.value}/100`, note: WEIGHT[weak.key] }
      : { plain: 'Weakest criterion', precise: weakestCriterion?.name || '—', value: weakestCriterion ? `${weakestCriterion.score}/10` : '—' },
  ];
  const b = result.scoreBreakdown;
  const bars = b
    ? (['entity', 'density', 'clarity', 'structure'] as const).map((k) => ({ label: DIMENSION_LABEL[k], pct: b[k], detail: WEIGHT[k] }))
    : [];
  const meaning = scoreMeaning({ score: result.score, citationProbability: result.citationProbability, breakdown: b, crawlerCriticalBlock: critical, weakestCriterion });
  // The first three actions the report already computes: the three weakest criteria, which
  // "Top 3 Priorities" and "Implementation Instructions" expand.
  const firstThree = [...result.criteria].sort((a, c) => a.score - c.score).slice(0, 3).map((c) => ({ what: c.name, section: 'Top 3 Priorities' }));
  if (critical) firstThree.unshift({ what: 'Unblock the citation-critical AI crawlers at the site root', section: 'AI Crawler Access' });
  return {
    title: 'AEO Analysis Report',
    brand: null,
    domain,
    date,
    preparedBy,
    headlines,
    barsTitle: 'The four dimensions of the score',
    bars,
    meaning,
    firstThree: firstThree.slice(0, 3),
    pointer: 'Appendix A carries the paste-ready schema; every recommendation in full follows the summary.',
  };
}
