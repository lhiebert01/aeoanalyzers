// WO-012 A — the other report's figure for page one. A Citation Sweep Report shows the domain's
// latest AEO Score as "Ready to be cited"; an AEO Score report shows the domain's latest sweep as
// "Recommended by engines". Read with the signed-in user's own token (row-level security keeps
// it to their rows). Best-effort: a failed read means "Not yet measured", never a guess.
import { supabaseQuery } from '../supabase';
import { normalizeDomain } from './citationSweep';
import type { LatestSweepFigure } from './scoreCover';

export async function latestScoreFor(domain: string): Promise<{ score: number } | null> {
  const want = normalizeDomain(domain);
  if (!want) return null;
  const { data, error } = await supabaseQuery('analysis_history', `select=url,score,created_at,is_duel&order=created_at.desc&limit=50`, 8000);
  if (error || !Array.isArray(data)) return null;
  const row = data.find((r: any) => !r.is_duel && normalizeDomain(String(r.url || '')) === want && typeof r.score === 'number');
  return row ? { score: row.score } : null;
}

/** Category recommendation from the stored per-engine summary: the same rules as the scorecard
 *  (errored, cut-off and from-memory answers are not counted). */
export async function latestSweepFor(domain: string): Promise<LatestSweepFigure | null> {
  const want = normalizeDomain(domain);
  if (!want) return null;
  const { data, error } = await supabaseQuery('citation_sweeps', `select=summary,created_at&domain=eq.${encodeURIComponent(want)}&order=created_at.desc&limit=1`, 8000);
  if (error || !Array.isArray(data) || !data[0]?.summary?.engines) return null;
  const engines: any[] = data[0].summary.engines;
  const n = engines.reduce((a, e) => a + (Number(e.categoryRuns) || 0), 0);
  const cited = engines.reduce((a, e) => a + (Number(e.categoryCited) || 0), 0);
  return n ? { cited, n, engines: engines.length, at: data[0].created_at } : null;
}
