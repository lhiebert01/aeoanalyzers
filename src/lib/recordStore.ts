// WO-012 G — the Record's reads and writes, with the signed-in user's own token. Row-level
// security keeps rows to their owner and allows writes only on Pro and Business.
import { supabaseQuery, supabaseInsert, getAccessToken } from '../supabase';
import { normalizeDomain } from './citationSweep';
import type { RecordEntry, SweepFigures } from './theRecord';
import { figuresFrom } from './recordFigures';
export { figuresFrom };

export async function listRecord(domain: string): Promise<RecordEntry[]> {
  const d = normalizeDomain(domain);
  const { data, error } = await supabaseQuery('action_records', `domain=eq.${encodeURIComponent(d)}&select=id,domain,title,owner_tag,source,action_key,done_at,note,link&order=done_at.asc,created_at.asc`, 8000);
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
  }, 8000);
  if (error) throw new Error(String(error.message || error));
}

/** The previous stored sweep of the same domain, before `beforeIso`, as figures. */
export async function previousSweepFigures(domain: string, beforeIso: string, ownedDomains: string[]): Promise<SweepFigures | null> {
  const d = normalizeDomain(domain);
  const { data, error } = await supabaseQuery('citation_sweeps', `domain=eq.${encodeURIComponent(d)}&created_at=lt.${encodeURIComponent(beforeIso)}&select=id,created_at,summary,full_result&order=created_at.desc&limit=1`, 8000);
  if (error || !Array.isArray(data) || !data[0]) return null;
  const s = data[0];
  const { data: rows } = await supabaseQuery('sweep_results', `sweep_id=eq.${s.id}&query_type=eq.branded&select=engine,query_type,sources,truncated,transcript`, 8000);
  const runs = (Array.isArray(rows) ? rows : []).map((r: any) => ({ engine: r.engine, queryType: r.query_type, sources: r.sources || [], truncated: r.truncated ?? undefined, transcript: r.transcript || '' }));
  return figuresFrom(s.created_at, s.summary, runs, d, ownedDomains, s.full_result?.sourceCoverage);
}
