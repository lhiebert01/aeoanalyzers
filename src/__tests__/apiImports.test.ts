// Vercel runs api/ as native ESM: a relative runtime import without ".js" type-checks and passes
// every unit test, then crashes the function at load (ERR_MODULE_NOT_FOUND). That took
// /api/run-sweep down in production (found 14 Oct 2026: './panel' in sweepDisclosure.ts).
// Walk every file reachable from api/*.ts and require the extension on runtime imports.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

function extensionlessImports(): string[] {
  const seen = new Set<string>(); const bad: string[] = [];
  const walk = (f: string) => {
    if (seen.has(f) || !existsSync(f)) return;
    seen.add(f);
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/^(import|export)\s(?!type\s)[^;]*?from\s+['"](\.[^'"]+)['"]/gm)) {
      const spec = m[2];
      if (!spec.endsWith('.js')) bad.push(`${f}: ${spec}`);
      const base = normalize(join(dirname(f), spec.replace(/\.js$/, '')));
      const hit = ['.ts', '.tsx', '/index.ts'].map((e) => base + e).find(existsSync);
      if (hit) walk(hit);
    }
  };
  for (const f of readdirSync('api')) if (f.endsWith('.ts')) walk(join('api', f));
  expect(seen.size).toBeGreaterThan(20); // the walk really followed the graph
  return bad;
}

describe('serverless import graph', () => {
  it('every relative runtime import reachable from api/ ends in .js', () => {
    expect(extensionlessImports()).toEqual([]);
  });
});
