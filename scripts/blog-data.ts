/**
 * Asserted numbers shared by the blog figures and the share cards (image polish pass, Nov 2026).
 * Every value is recomputed from docs/baselines/*.json with the rules of scripts/build-evidence.py
 * and asserted, so a changed baseline throws instead of shipping a stale image.
 */
import { readFileSync } from 'node:fs';

export const BASE = 'docs/baselines';
// Same pattern as NOT_FOUND in scripts/build-evidence.py.
export const NOT_FOUND = new RegExp(
  "(could ?n'?t find|couldn.t find|unable to find|no (?:specific )?(?:website|information|results?)" +
    ' (?:specifically )?(?:at|about|for)|don\'?t have (?:any )?(?:specific )?information' +
    "|(?:do not|don'?t|does not|doesn'?t) (?:contain|include|mention|have) (?:any )?(?:specific )?information (?:about|on|for))",
  'i',
);
export type Run = { engine: string; queryType: string; domainCited?: boolean; transcript?: string };
export const load = (f: string) => JSON.parse(readFileSync(`${BASE}/${f}`, 'utf8'));
export const runs = (f: string, kind: string): Run[] => load(f).runs.filter((r: Run) => r.queryType === kind);
export const isFound = (r: Run) => !!r.domainCited && !NOT_FOUND.test(r.transcript || '');
export function assertEq(label: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${label}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
}

export const MONTHS = [
  { m: 'Aug', long: 'August', f: 'aeoanalyzers-SERIES-ANCHOR-2026-08-01.json', restated: true, want: 55 },
  { m: 'Sep', long: 'September', f: 'aeoanalyzers-2026-09-01.json', restated: false, want: 80 },
  { m: 'Oct', long: 'October', f: 'aeoanalyzers-2026-10-08.json', restated: false, want: 88 },
  { m: 'Nov', long: 'November', f: 'aeoanalyzers-2026-11-01.json', restated: false, want: 78 },
].map((x) => {
  const b = runs(x.f, 'branded');
  const c = runs(x.f, 'category');
  const pct = Math.round((100 * b.filter(isFound).length) / b.length);
  const catHits = c.filter((r) => !!r.domainCited).length;
  assertEq(`${x.m} found-by-name %`, pct, x.want);
  assertEq(`${x.m} by-name N`, b.length, 40);
  assertEq(`${x.m} recommended`, [catHits, c.length], [0, 200]);
  return { ...x, pct, n: b.length, cat: catHits, catN: c.length };
});

export const NOV = 'aeoanalyzers-2026-11-01.json';
export const ENGINE_LABEL: Record<string, string> = { claude: 'Claude', perplexity: 'Perplexity', gemini: 'Gemini', openai: 'ChatGPT' };
export const PER_ENGINE = ['claude', 'perplexity', 'gemini', 'openai'].map((e) => {
  const rs = runs(NOV, 'branded').filter((r) => r.engine === e);
  return { key: e, name: ENGINE_LABEL[e], found: rs.filter(isFound).length, n: rs.length };
});
assertEq('Nov per-engine found', PER_ENGINE.map((p) => [p.name, p.found, p.n]), [
  ['Claude', 10, 10], ['Perplexity', 10, 10], ['Gemini', 10, 10], ['ChatGPT', 1, 10],
]);

export const SC = load(NOV).sourceCoverage;
export const scRows = SC.rows as { verdict: string }[];
export const scYes = scRows.filter((r) => r.verdict === 'yes').length;
export const scUnread = scRows.filter((r) => r.verdict === 'unreadable').length;
assertEq('Nov source coverage', [scRows.length, scYes, scUnread, SC.named, SC.recurringPages, SC.couldNotRead], [40, 0, 4, 0, 40, 4]);

// said-vs-site: the phrase Claude used for us in its by-name answers, and our registry short text.
export const QUOTE = 'AI simulation engine';
export const claudeBy = runs(NOV, 'branded').filter((r) => r.engine === 'claude');
export const quoteHits = claudeBy.filter((r) => (r.transcript || '').toLowerCase().includes(QUOTE.toLowerCase())).length;
assertEq('Claude "AI simulation engine" by-name answers', [quoteHits, claudeBy.length], [10, 10]);
export const REGISTRY = readFileSync('docs/identity/ENTITY-REGISTRY.md', 'utf8');
export const SHORT = 'Measures what AI answer engines say when buyers ask for a recommendation.';
if (!REGISTRY.includes(`Short: ${SHORT}`)) throw new Error('registry short text changed: docs/identity/ENTITY-REGISTRY.md');

// Engine panels, from the single source.
export const ENGINES = JSON.parse(readFileSync('src/data/engines.json', 'utf8'));
export const V11: string[] = ENGINES.panels['v1.1'].engines;
export const V12: string[] = ENGINES.panels['v1.2'].engines;
assertEq('panel v1.2 = v1.1 + extra', V12.slice(0, V11.length), V11);
export const EXTRA = V12.slice(V11.length); // Grok
assertEq('plans', [ENGINES.plans['Day Pass'], ENGINES.plans.Pro, ENGINES.plans.Business], ['v1.1', 'v1.2', 'v1.2']);

