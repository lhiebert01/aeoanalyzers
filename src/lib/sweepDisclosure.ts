// WO-AEO-PRODUCT-FIXES-003 — what a number is counted out of, and whether two surfaces agree.
//
// 4.2 A stored figure and an opened figure must be the same number or say why they differ.
//     SCORING_VERSION names the scoring rules a sweep was scored under. It is persisted on
//     the row at write time (api/run-sweep, scripts/import-stored-sweeps) and, when the saved
//     view re-scores a row under newer rules and the pooled figures move, the row is updated
//     with the new summary, the version, and a note stating old → new and why.
// 4.3 Every count carries its denominator and what it is made of, in one readable line.
// 4.4 Two dates on the same configs are a series: the product shows both, the delta and a
//     link to each date's transcripts — the pairing that was assembled by hand on Oct 8.
import type { SweepRunResult, SweepScorecard, SweepSummary } from './citationSweep';

/** Bump when a scoring rule changes (strict branded rule, errored exclusion, grounding). */
export const SCORING_VERSION = '2026-10-08';

export const isErrored = (r: SweepRunResult) => !!(r as any).errored || /^\s*\[error:/i.test(r.transcript || '');

export interface Denominator { branded: string; category: string }

/** "N=32 scored answers = 5 questions × 4 engines × 3 runs = 60 category answers; 28 answered
 *  from memory (not scored)." — the line a technical founder asks for before anyone has to. */
export function describeDenominator(
  runs: SweepRunResult[], engines: number, runsPerQuery: number, sc: SweepScorecard,
): Denominator {
  const cat = runs.filter((r) => r.queryType === 'category');
  const br = runs.filter((r) => r.queryType === 'branded');
  const q = (rs: SweepRunResult[]) => new Set(rs.map((r) => r.query)).size;
  const errored = (rs: SweepRunResult[]) => rs.filter(isErrored).length;
  const cutOff = (rs: SweepRunResult[]) => rs.filter((r) => !isErrored(r) && r.truncated).length;
  const parts = (rs: SweepRunResult[], memory: number) => {
    const out: string[] = [];
    if (memory) out.push(`${memory} answered from memory (no search, not scored)`);
    const e = errored(rs); if (e) out.push(`${e} errored (excluded)`);
    const c = cutOff(rs); if (c) out.push(`${c} cut off by the length cap (not scored)`);
    return out.length ? `; ${out.join(', ')}` : '';
  };
  const s = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const category = `N=${sc.categoryRuns} scored answers = ${s(q(cat), 'question')} × ${s(engines, 'engine')} × ${s(runsPerQuery, 'run')} = ${cat.length} category answers${parts(cat, sc.modelPriorRuns)}.`;
  const branded = `N=${sc.brandedRuns} = ${s(q(br), 'question')} × ${s(engines, 'engine')} × ${s(runsPerQuery, 'run')} = ${br.length} branded answers${parts(br, 0)}.`;
  return { branded, category };
}

/** Pooled over engines, search-grounded category runs only — the same basis the History
 *  list, the scorecard and the report use. null when nothing was measured. */
export function pooledFromSummary(summary: SweepSummary | null | undefined): { branded: number | null; category: number | null } {
  const engines = (summary?.engines || []) as any[];
  const pool = (cited: string, runs: string) => {
    const n = engines.reduce((a, e) => a + (e[runs] || 0), 0);
    if (!n) return null;
    return Math.round((engines.reduce((a, e) => a + (e[cited] || 0), 0) / n) * 100);
  };
  return { branded: pool('brandedCited', 'brandedRuns'), category: pool('categoryCited', 'categoryRuns') };
}

export interface SweepRowLike {
  id: string; domain: string; created_at: string; summary?: SweepSummary | null;
  category?: string | null; category_queries?: string[] | null; branded_queries?: string[] | null; scoring_version?: string | null;
}

/** Two sweeps are comparable only on the SAME configs: same domain, same category noun, same
 *  category questions. A row that predates the config columns compares on domain + category. */
export function sameConfig(a: SweepRowLike, b: SweepRowLike): boolean {
  if (String(a.domain).toLowerCase() !== String(b.domain).toLowerCase()) return false;
  if ((a.category || '') !== (b.category || '')) return false;
  const qa = a.category_queries, qb = b.category_queries;
  if (!qa?.length || !qb?.length) return true;
  const key = (q: string[]) => [...q].map((x) => x.trim().toLowerCase()).sort().join('\n');
  return key(qa) === key(qb);
}

export interface SeriesPoint { id: string; date: string; branded: number | null; category: number | null; deltaCategory: number | null; deltaBranded: number | null; scoringVersion: string | null }

/** The dated series for one target on one config, oldest first, each point carrying the delta
 *  against the previous date. Only rows comparable with `current` are included. */
export function buildSeries(rows: SweepRowLike[], current: SweepRowLike): SeriesPoint[] {
  const same = rows.filter((r) => sameConfig(r, current)).sort((a, b) => a.created_at.localeCompare(b.created_at));
  let prev: { branded: number | null; category: number | null } | null = null;
  return same.map((r) => {
    const p = pooledFromSummary(r.summary);
    const point: SeriesPoint = {
      id: r.id, date: r.created_at.slice(0, 10), branded: p.branded, category: p.category,
      deltaCategory: prev && prev.category !== null && p.category !== null ? p.category - prev.category : null,
      deltaBranded: prev && prev.branded !== null && p.branded !== null ? p.branded - prev.branded : null,
      scoringVersion: r.scoring_version ?? null,
    };
    prev = p;
    return point;
  });
}

/** 4.2: the note recorded when re-scoring a stored row moves a pooled figure. */
export function rescoreNote(oldV: string | null | undefined, stored: { branded: number | null; category: number | null }, now: { branded: number | null; category: number | null }): string | null {
  const moved: string[] = [];
  const f = (v: number | null) => (v === null ? '—' : `${v}%`);
  if (stored.branded !== now.branded) moved.push(`found by name ${f(stored.branded)} → ${f(now.branded)}`);
  if (stored.category !== now.category) moved.push(`recommended ${f(stored.category)} → ${f(now.category)}`);
  if (!moved.length) return null;
  return `Re-scored on open under scoring rules ${SCORING_VERSION} (stored under ${oldV || 'unversioned rules'}): ${moved.join('; ')}. Errored runs are excluded, a branded answer that searched and did not find the site is a miss, and only search-grounded category answers are scored.`;
}
