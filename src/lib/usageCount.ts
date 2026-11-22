// Server-side usage counting (founder ruling, Nov 21 2026). Import-free: api/llm-generate.ts
// imports it. users.usage_count is written only by the server (increment_usage_count), never by
// the browser.
//
// One site analysis = one count. An analysis makes two calls to api/llm-generate in parallel (the
// core score and the enhanced fixes), and a duel scores two sites and then compares them, so the
// server counts the call that produces a site's score: the one whose schema requires a top-level
// `score`. The label is not trusted from the client; the schema decides, and a caller that leaves
// `score` out of the schema gets no score back.

/** True when this generation request produces a site's AEO score (the counted call). */
export function isSiteAnalysisSchema(schema: unknown): boolean {
  const s = schema as { properties?: Record<string, unknown>; required?: unknown } | null | undefined;
  if (!s || typeof s !== 'object') return false;
  const req = Array.isArray(s.required) ? s.required : [];
  return !!(s.properties && Object.prototype.hasOwnProperty.call(s.properties, 'score')) || req.includes('score');
}

/** The free tier is capped on the server-written lifetime count. Null count = unreadable → not capped (fail open). */
export function freeLimitReached(tier: string | null | undefined, usageCount: number | null | undefined, allowance: number): boolean {
  if (tier && tier !== 'free') return false;
  return typeof usageCount === 'number' && usageCount >= allowance;
}
