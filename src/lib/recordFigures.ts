// WO-012 G — one sweep's figures for "Measured after these actions.", each with its denominator.
// Pure (no database client), so the report builder, the scripts and the tests can all use it.
import type { SweepRunResult } from './citationSweep';
import { corroboration, coverageCounts, type SourceCoverage } from './sourceCoverage';
import type { SweepFigures } from './theRecord';

type SummaryLike = { engines?: { engine: string; brandedRuns?: number; brandedCited?: number; categoryRuns?: number; categoryCited?: number }[]; panel?: { version?: string } } | null | undefined;

/** Figures for one sweep from its summary, its runs (for corroboration) and its coverage. */
export function figuresFrom(date: string, summary: SummaryLike, runs: Pick<SweepRunResult, 'queryType' | 'sources' | 'truncated' | 'transcript' | 'engine'>[], domain: string, ownedDomains: string[], coverage: SourceCoverage | null | undefined): SweepFigures {
  const eng = summary?.engines || [];
  const sum = (k: 'brandedRuns' | 'brandedCited' | 'categoryRuns' | 'categoryCited') => eng.reduce((a, e) => a + (Number(e[k]) || 0), 0);
  const cor = corroboration(runs as SweepRunResult[], domain, ownedDomains);
  const cc = coverage ? coverageCounts(coverage) : null;
  return {
    date,
    panel: summary?.panel?.version || 'v1.1',
    engines: eng.map((e) => e.engine).sort(),
    foundByName: sum('brandedRuns') ? { cited: sum('brandedCited'), n: sum('brandedRuns') } : null,
    recommended: sum('categoryRuns') ? { cited: sum('categoryCited'), n: sum('categoryRuns') } : null,
    coverage: cc ? { yes: cc.yes, n: cc.n } : null,
    corroboration: runs.some((r) => r.queryType === 'branded') ? { thirdParty: cor.thirdParty, sources: cor.sources } : null,
  };
}

