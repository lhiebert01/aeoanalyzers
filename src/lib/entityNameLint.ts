// L-NAME-1 (founder ruling, 1 Nov 2026): the company is PIGENAI LLC. The retired spelling
// "PI GenAI" fails the build anywhere in public copy. Two exceptions, both deliberate:
//  - the JSON-LD alternateName "PI GenAI LLC" (registry naming ruling, 5 Sep 2026: the retired
//    spelling survives only as an alias, so engines that learned it still resolve the entity);
//  - comment lines in source code, which quote engine answers word for word as evidence.
// Pure: the file walk lives in scripts/lint-entity-name.ts.

export const RETIRED_COMPANY = /PI[\s-]*GenAI/;
const ALIAS = /["']?alternateName["']?\s*:\s*["']PI GenAI LLC["']/g;
const CODE = /\.(ts|tsx|js|mjs|py)$/;

export interface NameHit { file: string; line: number; text: string }

export function lintEntityName(file: string, content: string): NameHit[] {
  const hits: NameHit[] = [];
  content.split('\n').forEach((raw, i) => {
    if (CODE.test(file) && /^\s*(\/\/|\*|\/\*|#)/.test(raw)) return;
    const line = raw.replace(ALIAS, '');
    if (RETIRED_COMPANY.test(line)) hits.push({ file, line: i + 1, text: raw.trim().slice(0, 160) });
  });
  return hits;
}
