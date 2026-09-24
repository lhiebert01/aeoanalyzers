import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { schemaClaimViolations } from '../lib/voiceLint';

/** WO-AEO-SCHEMA-CLAIM-PRECISION-001. "Cannot read" describes the crawler and is false;
 *  "shows no sign of using when choosing what to cite" describes citation behaviour and is
 *  what the evidence supports. The rule fires only when a banned verb and a schema noun
 *  share one sentence, so the crawler-access report can still say a BLOCKED engine cannot
 *  read the PAGE. */
const root = resolve(__dirname, '..', '..');

describe('schemaClaimViolations', () => {
  it('flags the retracted sentence in every banned form', () => {
    for (const s of [
      'six of seven AI platforms cannot read your schema',
      "6 of 7 platforms can't read your schema.",
      'Most engines do not read structured data.',
      'Your JSON-LD is invisible to ChatGPT.',
      'ChatGPT ignores your schema markup.',
    ]) expect(schemaClaimViolations(s), s).toHaveLength(1);
  });
  it('passes the ratified wording and the crawler-access sentence', () => {
    for (const s of [
      'six of seven AI platforms show no sign of using your schema when choosing what to cite',
      'The crawlers fetch the HTML, and the JSON-LD is in it, but most show no sign of using it when deciding what to cite.',
      'These engines cannot read your page. Remove the Disallow rules.',       // no schema noun in that sentence
      'These engines are blocked from fetching your page, so nothing on it — content or structured data — reaches them.',
      'If those live only in your schema, an AI cannot quote you on them.',   // "quote", not "read"
    ]) expect(schemaClaimViolations(s), s).toEqual([]);
  });
  it('does not leap across a sentence boundary', () => {
    expect(schemaClaimViolations('Engines cannot read a blocked page. Your schema is fine.')).toEqual([]);
  });
});

describe('no published surface or report template carries the retracted claim', () => {
  // voiceLint.ts is deliberately NOT scanned: it has to spell out the phrases it bans.
  const files: string[] = [];
  const walk = (d: string) => { for (const e of readdirSync(d)) { const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p); else if (/\.html$/.test(p)) files.push(p); } };
  walk(join(root, 'public'));
  for (const t of readdirSync(join(root, 'public'))) if (/^llms.*\.txt$/.test(t)) files.push(join(root, 'public', t));
  for (const src of ['src/lib/crawlerAccess.ts', 'src/lib/doNowPlan.ts', 'src/lib/sweepActions.ts',
                     'src/services/docxGenerator.ts', 'src/components/ImplementationRoadmap.tsx',
                     'src/components/SweepDashboard.tsx', 'src/components/AdvancedAnalysisCards.tsx',
                     'scripts/exec-report-stored.ts', 'autopost-packs/aeo-blitz-001/campaign.json',
                     'scripts/launch/build-disti-pack.py', 'scripts/launch/build-posts-567.py'])
    if (existsSync(join(root, src))) files.push(join(root, src));

  it('scans a real set of files', () => expect(files.length).toBeGreaterThan(15));
  it.each(files)('%s', (f) => {
    expect(schemaClaimViolations(readFileSync(f, 'utf8'))).toEqual([]);
  });
});
