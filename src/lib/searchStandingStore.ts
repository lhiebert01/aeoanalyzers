// WO-015 Lane 0 storage. Only the DERIVED table is stored (table search_standing, owner-only by
// row-level security); the uploaded Search Console file is parsed in the browser and never sent.
import { supabaseQuery, supabaseInsert, getAccessToken } from '../supabase';
import { normalizeDomain } from './citationSweep';
import { deriveStanding, exportFromXlsx, exportFromCsv, toStored, type SearchStanding } from './searchStanding';

function currentUserId(): string | null {
  try {
    const t = getAccessToken(); if (!t) return null;
    const part = t.split('.')[1]; if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.sub === 'string' ? json.sub : null;
  } catch { return null; }
}

/** The latest two stored tables for a domain (now, and the one before it for "Moving first"). */
export async function latestStandings(domain: string): Promise<{ now: SearchStanding | null; previous: SearchStanding | null }> {
  const d = normalizeDomain(domain);
  const { data, error } = await supabaseQuery('search_standing', `domain=eq.${encodeURIComponent(d)}&source=eq.google&select=derived,created_at&order=created_at.desc&limit=2`, 8000);
  if (error || !Array.isArray(data)) return { now: null, previous: null };
  return { now: (data[0]?.derived as SearchStanding) ?? null, previous: (data[1]?.derived as SearchStanding) ?? null };
}

/** Parse the uploaded export in the browser, derive the table, store only the table. */
export async function uploadStanding(file: File, ctx: { domain: string; brand?: string | null; people?: string[]; vendorNames?: string[] }): Promise<SearchStanding> {
  const name = file.name.toLowerCase();
  let exp;
  if (name.endsWith('.xlsx')) {
    const { default: JSZip } = await import('jszip');
    exp = await exportFromXlsx(await file.arrayBuffer(), (b) => JSZip.loadAsync(b) as any);
  } else if (name.endsWith('.csv')) {
    exp = exportFromCsv(await file.text());
  } else throw new Error('Upload the Excel (.xlsx) or CSV file from Search Console, Performance, Export.');
  if (!exp.queries.length) throw new Error('No queries were found in this file. Use the Performance export with the Queries sheet.');
  const standing = deriveStanding(exp, { ...ctx, source: 'google' });
  const userId = currentUserId();
  if (!userId) throw new Error('Sign in to keep your search standing.');
  const { error } = await supabaseInsert('search_standing', { user_id: userId, domain: normalizeDomain(ctx.domain), source: 'google', period_label: exp.period, derived: toStored(standing) }, 8000);
  if (error) throw new Error(/row-level security|42501/i.test(String(error.message || error)) ? 'Search standing is included on Pro and Business, and with an active Day Pass.' : 'Could not save. Try again.');
  return standing;
}
