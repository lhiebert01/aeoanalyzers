// WO-QA-003 E1 — Position-Adjusted Word Count (PAWC) citation scoring.
//
// Every other tool scores a citation as binary (mentioned / not). The Princeton
// GEO study (arXiv:2311.09735, SIGKDD 2024) weights a citation by how MUCH of the
// answer is attributed to it and WHERE — early, prominent mentions count for more
// than a footnote (exponential position decay). "Cited in sentence one" and "cited
// in a trailing aside" are commercially different outcomes; this scores the gap.
//
// Framing rule (Lane E): effect sizes are cited as STUDY FINDINGS, never guarantees.
// This module only computes the metric; any copy referencing it says "in the
// Princeton GEO study…", never "you will get…".
//
// Deterministic + self-contained (no intra-lib imports → safe anywhere). Computed
// retroactively over stored transcripts — zero API spend.

/** Split answer text into rough sentences for position weighting. */
function sentences(text: string): string[] {
  return String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const wordCount = (s: string): number => (s.match(/\S+/g) || []).length;

/**
 * PAWC "answer share" for a subject in ONE answer, in [0,1]. It is the subject's
 * position-weighted share of the answer's words: for each sentence that mentions
 * the subject, weight = words(sentence) × e^(−index/total), summed and normalized
 * by the same weighting over ALL sentences. 0 when never mentioned; higher when the
 * subject owns more of the answer, earlier.
 *
 * `mentions(sentence)` decides whether a sentence is attributed to the subject —
 * the caller passes a grounded matcher (brand/domain/competitor), matching the
 * "nearest-mention span" heuristic from the paper.
 */
export function pawcShare(transcript: string, mentions: (sentence: string) => boolean): number {
  const sents = sentences(transcript);
  const n = sents.length;
  if (!n) return 0;
  let subjectWeight = 0;
  let totalWeight = 0;
  for (let i = 0; i < n; i++) {
    const decay = Math.exp(-i / n);          // early sentences weigh more
    const w = wordCount(sents[i]) * decay;
    totalWeight += w;
    if (mentions(sents[i])) subjectWeight += w;
  }
  return totalWeight > 0 ? subjectWeight / totalWeight : 0;
}

/** Average PAWC answer-share across the answers where the subject actually appears
 *  (share > 0). Returns { avgShare, answers } — avgShare in [0,1], null when the
 *  subject never appeared. Use over grounded, non-truncated category runs. */
export function avgPawc(
  transcripts: string[],
  mentions: (sentence: string) => boolean
): { avgShare: number; answers: number } {
  let sum = 0;
  let answers = 0;
  for (const t of transcripts) {
    const s = pawcShare(t, mentions);
    if (s > 0) { sum += s; answers++; }
  }
  return { avgShare: answers ? sum / answers : 0, answers };
}
