// WO-012 G — the Record's reads and writes, with the signed-in user's own token. Row-level
// security keeps rows to their owner and allows writes only on Pro and Business.
import { supabaseQuery, supabaseInsert, getAccessToken } from '../supabase';
import { normalizeDomain } from './citationSweep';
import type { RecordEntry, SweepFigures } from './theRecord';
import { figuresFrom } from './recordFigures';
export { figuresFrom };

export async function listRecord(domain: string): Promise<RecordEntry[]> {
  const d = normalizeDomain(domain);
  const { data, error } = await supabaseQuery('action_records', `domain=eq.${encodeURIComponent(d)}&select=id,domain,title,owner_tag,source,action_key,done_at,note,link,hypothesis,metric,metric_key,baseline,check_dates&order=done_at.asc,created_at.asc`, 8000);
  if (error) throw new Error(String(error.message || error));
  return Array.isArray(data) ? data : [];
}

/** The signed-in user's id, from the access token's subject. */
export function currentUserId(): string | null {
  try {
    const part = getAccessToken().split('.')[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.sub === 'string' ? json.sub : null;
  } catch { return null; }
}

export async function addRecord(e: RecordEntry): Promise<void> {
  const userId = currentUserId();
  if (!userId) throw new Error('Sign in to add to the Record.');
  const { error } = await supabaseInsert('action_records', {
    user_id: userId, domain: normalizeDomain(e.domain), title: e.title.trim().slice(0, 500), owner_tag: e.owner_tag,
    source: e.source, action_key: e.action_key ?? null, done_at: e.done_at,
    note: e.note?.trim() || null, link: e.link?.trim() || null,
    // WO-015 experiment log (optional). Sent only when set, so a row saves before the columns exist.
    ...(e.metric || e.hypothesis ? {
      hypothesis: e.hypothesis?.trim().slice(0, 1000) || null, metric: e.metric?.trim().slice(0, 300) || null,
      metric_key: e.metric_key?.trim().slice(0, 300) || null, baseline: e.baseline?.trim().slice(0, 300) || null,
      check_dates: (e.check_dates || []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
    } : {}),
  }, 8000);
  if (error) throw new Error(String(error.message || error));
}

/** The previous stored sweep of the same domain, before `beforeIso`, as figures. */
/** WO-015: which question series a stored sweep belongs to (no marker = the main series). */
export const seriesOf = (summary: any): 'main' | 'differentiator' => (summary?.panel?.series === 'differentiator' ? 'differentiator' : 'main');

export async function previousSweepFigures(domain: string, beforeIso: string, ownedDomains: string[], series: 'main' | 'differentiator' = 'main'): Promise<SweepFigures | null> {
  const d = normalizeDomain(domain);
  const { data, error } = await supabaseQuery('citation_sweeps', `domain=ilike.${encodeURIComponent(d)}&created_at=lt.${encodeURIComponent(beforeIso)}&select=id,created_at,summary,full_result&order=created_at.desc&limit=10`, 8000);
  if (error || !Array.isArray(data)) return null;
  // Compare like with like: the previous sweep of the SAME question series.
  const s = data.find((x: any) => seriesOf(x.summary) === series);
  if (!s) return null;
  const { data: rows } = await supabaseQuery('sweep_results', `sweep_id=eq.${s.id}&query_type=eq.branded&select=engine,query_type,sources,truncated,transcript`, 8000);
  const runs = (Array.isArray(rows) ? rows : []).map((r: any) => ({ engine: r.engine, queryType: r.query_type, sources: r.sources || [], truncated: r.truncated ?? undefined, transcript: r.transcript || '' }));
  return figuresFrom(s.created_at, s.summary, runs, d, ownedDomains, s.full_result?.sourceCoverage);
}

/** WO-015: the recommended rate of a question series' latest sweeps of a domain (now, and the one
 *  before), from stored answers. Category answers that errored or were cut off are not counted. */
export async function seriesRates(domain: string, series: 'main' | 'differentiator'): Promise<{ now: number | null; previous: number | null }> {
  const d = normalizeDomain(domain);
  const { data, error } = await supabaseQuery('citation_sweeps', `domain=ilike.${encodeURIComponent(d)}&select=id,created_at,summary&order=created_at.desc&limit=20`, 8000);
  if (error || !Array.isArray(data)) return { now: null, previous: null };
  const mine = data.filter((x: any) => seriesOf(x.summary) === series).slice(0, 2);
  const rate = async (id: string) => {
    const { data: rows } = await supabaseQuery('sweep_results', `sweep_id=eq.${id}&query_type=eq.category&select=cited,truncated,transcript`, 8000);
    const ok = (Array.isArray(rows) ? rows : []).filter((r: any) => !r.truncated && !String(r.transcript || '').startsWith('[error'));
    return ok.length ? Math.round((100 * ok.filter((r: any) => r.cited).length) / ok.length) : null;
  };
  return { now: mine[0] ? await rate(mine[0].id) : null, previous: mine[1] ? await rate(mine[1].id) : null };
}
