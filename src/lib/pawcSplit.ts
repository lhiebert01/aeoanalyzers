// WO-AEO-REPORT-POLISH-001 Lane D — "Recommended (prominent)" vs "Mentioned".
//
// Being cited is binary; being RECOMMENDED is not. The E1 metric (lib/pawc.ts, the Princeton
// GEO study's position-adjusted word count) already scores how much of an answer a subject
// owns and how early. This module only SPLITS answers on that existing score; it changes no
// metric value anywhere.
//
// Footnote (rendered wherever the split appears): an answer counts as "Recommended
// (prominent)" when the subject owns at least a quarter of the answer's position-weighted
// words — it is the answer, or a large early part of it. "Mentioned" is any other answer that
// names the subject at all. An answer that never names the subject is in neither column.
import { pawcShare } from './pawc';

export const PROMINENT_SHARE = 0.25;
export const PROMINENT_FOOTNOTE = 'Recommended (prominent) = the answer attributes at least a quarter of its position-weighted words to you (Princeton GEO position-adjusted word count); Mentioned = named, but less than that. Answers that never name you are in neither column.';

export interface PawcSplit { prominent: number; mentioned: number; answers: number }

export function mentionsClient(client: { domain: string; brand?: string | null }): (sentence: string) => boolean {
  const d = client.domain.toLowerCase().replace(/^www\./, '');
  const b = (client.brand || '').toLowerCase();
  return (s: string) => { const l = s.toLowerCase(); return l.includes(d) || (b.length >= 3 && l.includes(b)); };
}

export function pawcSplit(transcripts: string[], mentions: (sentence: string) => boolean): PawcSplit {
  let prominent = 0, mentioned = 0;
  for (const t of transcripts) {
    const share = pawcShare(t, mentions);
    if (share >= PROMINENT_SHARE) prominent++;
    else if (share > 0) mentioned++;
  }
  return { prominent, mentioned, answers: transcripts.length };
}
