// WO-014 — gather a domain's STORED data for the step-by-step guide, with the signed-in user's own
// token (row-level security keeps it to their rows). No live fetch of the customer's site and no
// model call happen here: the guide re-expresses what is already stored.
import { supabaseQuery } from '../supabase';
import { normalizeDomain } from './citationSweep';
import type { SiteFacts } from './truthRecord';
import type { SourceCoverage } from './sourceCoverage';
import type { GuideScore } from './stepGuide';

export interface StoredGuideData {
  score: GuideScore | null;
  sweep: { id: string; category: string | null; site: SiteFacts | null; coverage: SourceCoverage | null } | null;
}

/** The domain's latest AEO Score, with the fields Part 1 uses. */
export async function latestScoreDetail(domain: string): Promise<GuideScore | null> {
  const want = normalizeDomain(domain);
  const { data, error } = await supabaseQuery('analysis_history', 'select=url,score,created_at,is_duel,full_result&order=created_at.desc&limit=30', 10000);
  if (error || !Array.isArray(data)) return null;
  const row = data.find((r: any) => !r.is_duel && normalizeDomain(String(r.url || '')) === want);
  if (!row) return null;
  let fr: any = row.full_result;
  if (typeof fr === 'string') { try { fr = JSON.parse(fr); } catch { fr = null; } }
  return {
    score: Number(row.score),
    at: row.created_at,
    checklist: Array.isArray(fr?.implementationChecklist) ? fr.implementationChecklist : [],
    verifiedSchema: typeof fr?.verifiedSchema === 'string' && fr.verifiedSchema.trim() ? fr.verifiedSchema : null,
    metaSuggested: fr?.metaDescriptionRewrite?.suggested || null,
    platform: fr?.detectedPlatform?.platform || null,
  };
}

/** A stored sweep's guide fields: category, the site's own facts (from the sweep snapshot or the
 *  latest "Check source coverage"), and Source coverage. Latest sweep of the domain when no id. */
export async function sweepGuideDetail(domain: string, sweepId?: string | null): Promise<StoredGuideData['sweep']> {
  const q = sweepId
    ? `id=eq.${sweepId}&select=id,category,full_result`
    : `domain=ilike.${encodeURIComponent(normalizeDomain(domain))}&select=id,category,full_result&order=created_at.desc&limit=1`;
  const { data, error } = await supabaseQuery('citation_sweeps', q, 10000);
  if (error || !Array.isArray(data) || !data[0]) return null;
  const s = data[0]; const fr = s.full_result || {};
  return { id: s.id, category: s.category || null, site: fr.truth?.site || fr.siteFacts || null, coverage: fr.sourceCoverage || null };
}

const KEY = (d: string) => `aeo.guide.businessType.${normalizeDomain(d)}`;
/** The customer's confirmed business type, remembered in this browser (a convenience only). */
export function rememberedBusinessType(domain: string): string | null {
  try { return localStorage.getItem(KEY(domain)); } catch { return null; }
}
export function rememberBusinessType(domain: string, t: string): void {
  try { localStorage.setItem(KEY(domain), t); } catch { /* the choice is asked again next time */ }
}
