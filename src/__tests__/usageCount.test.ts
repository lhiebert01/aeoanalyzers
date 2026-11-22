import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { isSiteAnalysisSchema, freeLimitReached } from '../lib/usageCount';

/** Founder ruling (Nov 21, 2026): usage_count is counted and enforced on the server. */
describe('server-side usage counting', () => {
  it('counts the call that produces a site score, not the enhanced fixes or the duel verdict', () => {
    expect(isSiteAnalysisSchema({ type: 'OBJECT', properties: { score: {}, summary: {} }, required: ['score', 'summary'] })).toBe(true);
    expect(isSiteAnalysisSchema({ type: 'OBJECT', properties: { verifiedSchema: {} }, required: ['verifiedSchema', 'metaDescriptionRewrite', 'implementationChecklist'] })).toBe(false);
    expect(isSiteAnalysisSchema({ type: 'OBJECT', properties: { verdict: {}, winner: {} }, required: ['verdict', 'winner'] })).toBe(false);
    expect(isSiteAnalysisSchema(undefined)).toBe(false);
  });
  it('the real analysis schemas in the client classify as expected', () => {
    const src = readFileSync('src/services/geminiService.ts', 'utf8');
    const top = (name: string) => src.slice(src.indexOf(`const ${name} = {`)).split('\n').find((l) => /^ {4}required:/.test(l)) || '';
    expect(top('coreSchema')).toContain('"score"');
    expect(top('enhancedSchema')).not.toContain('"score"');
    expect(top('duelSchema')).not.toContain('"score"');
  });
  it('the free cap holds at 3, not before, and never caps a paid tier', () => {
    expect(freeLimitReached('free', 2, 3)).toBe(false);
    expect(freeLimitReached('free', 3, 3)).toBe(true);
    expect(freeLimitReached('free', 4, 3)).toBe(true);
    expect(freeLimitReached(undefined, 3, 3)).toBe(true);
    expect(freeLimitReached('free', null, 3)).toBe(false);
    expect(freeLimitReached('Pro', 500, 3)).toBe(false);
    expect(freeLimitReached('daypass', 500, 3)).toBe(false);
  });
  it('the server increments and enforces it; the browser no longer writes it', () => {
    const route = readFileSync('api/llm-generate.ts', 'utf8');
    expect(route).toMatch(/freeLimitReached\(ent0\.tier, ent0\.usageCount/);
    expect(route).toMatch(/isSiteAnalysisSchema\(schema\)\)\s*\{\s*await incrementUsageCount\(ent\.userId\)/);
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app).not.toMatch(/usage_count:\s*newCount/);
    expect(app).not.toMatch(/supabaseUpdate\('users'/);
  });
});
