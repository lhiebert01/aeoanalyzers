// Single source of truth for every Gemini model AEO Analyzers calls.
// Env overrides: SWEEP_GEMINI_MODEL (sweep primary), GEMINI_SWEEP_FALLBACKS and
// GEMINI_LLM_MODELS (comma-separated, best first). The defaults below are the decision.
// Updated 2026-11-20 (WO-PORTFOLIO-GEMINI-MIGRATION-001): removed gemini-2.5-flash (Google
// silently routes it to a LITE model from Dec 1 2026, which would quietly change sweep
// results customers compare over time) and gemini-3.5-flash (already auto-routed to 3.6-flash).

const list = (envValue: string | undefined, fallback: string[]): string[] => {
  const parsed = (envValue || '').split(',').map((s) => s.trim()).filter(Boolean);
  return parsed.length ? parsed : fallback;
};

// Citation Sweep "Gemini" engine: full-quality flash first; 2.5-flash-lite (no shutdown
// announced) is the last-resort capacity fallback only.
export const SWEEP_GEMINI_MODELS: string[] = [
  ...new Set([
    (process.env.SWEEP_GEMINI_MODEL || '').trim() || 'gemini-3.6-flash',
    ...list(process.env.GEMINI_SWEEP_FALLBACKS, ['gemini-3.8-flash', 'gemini-2.5-flash-lite']),
  ]),
];

// /api/llm-generate (customer-facing fix generation): quality first, lite only as last resort.
export const LLM_GEMINI_MODELS: string[] = list(process.env.GEMINI_LLM_MODELS, [
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
]);
