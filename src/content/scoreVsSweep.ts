// WO-UX-CLARITY-001 — the "Which tool, when?" explainer copy, in one place so it
// renders identically on the Analyzer page, the Sweeps page, and the FAQ, and so a
// single voice-lint test can guard every user-facing string.
//
// Framing is founder-ratified: the AEO Score is the INSIDE-OUT readiness measure
// (your site's structure — the part you control), the Citation Sweep is the
// OUTSIDE-IN outcome (what the engines actually do). Cross-link strings are supplied
// verbatim. Card/tagline/FAQ prose authored to that ratified framing.

export const SCORE_VS_SWEEP = {
  heading: 'Which tool, when?',
  score: {
    title: 'AEO Score — examines your site',
    body: 'The inside-out readiness measure: how citable your page is structurally — schema, entity graph, factual density, answerable copy. This is the part you control, and it ships with the exact fixes to raise it.',
  },
  sweep: {
    title: 'Citation Sweep — interrogates the engines',
    body: 'The outside-in outcome: what ChatGPT, Claude, Perplexity, and Gemini say when buyers ask — measured N times per question, every answer stored as a transcript. This is the real-world result your readiness is working toward.',
  },
  // Cross-links (supplied verbatim).
  toSweep: 'Prove your fixes worked — run a Citation Sweep →',
  toScore: 'Structural fixes live in your AEO Score →',
  // One-line taglines under each destination's heading.
  tagline: {
    analyzer: 'The inside-out readiness measure — your site’s structure, and the fixes to improve it.',
    sweeps: 'The outside-in outcome — what the engines actually say, backed by stored transcripts.',
  },
  // One FAQ entry.
  faq: {
    q: 'What’s the difference between the AEO Score and a Citation Sweep?',
    a: 'The AEO Score examines your site — an inside-out readiness measure of how citable your page is structurally (schema, entity graph, factual density), with the exact fixes to raise it. A Citation Sweep interrogates the answer engines — an outside-in measure of what ChatGPT, Claude, Perplexity, and Gemini say when buyers ask, N times per question, every answer stored as a transcript. Use the Score to do the structural work; use the Sweep to check whether the engines have caught up. Readiness usually leads outcome by a few crawl-and-authority cycles.',
  },
};

/** Flat list of every user-facing string above — for the voice-lint guard test. */
export function scoreVsSweepStrings(): string[] {
  const s = SCORE_VS_SWEEP;
  return [
    s.heading, s.score.title, s.score.body, s.sweep.title, s.sweep.body,
    s.toSweep, s.toScore, s.tagline.analyzer, s.tagline.sweeps, s.faq.q, s.faq.a,
  ];
}
