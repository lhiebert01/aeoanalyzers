// BUILD GUARD — a module in the schema or plan-builder path must have an importer.
//
// WO-AEO-GREENLIGHT-005 item 3. Three modules reached "shipped" while imported by
// nothing: the schema generator was wired to one renderer but not the other, and the
// first-person detector and the Do-Now plan builder were wired to neither. Each had
// passing tests. Tests prove a module works; they say nothing about whether anything
// calls it, and a module nothing calls is code on disk, not a feature.
//
// "There is no reason to think the fourth won't." So this fails the build instead.
//
// Scope is deliberately narrow: modules on the paths that produce customer-facing
// remediation. A general orphan check across the repo would fire on entry points and
// type-only modules and get switched off, which is worse than not having it.
//
// Run by `npm run build` before vite. Prove it by orphaning a module: the build fails.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/** Modules that MUST be reachable from something that renders. Add a module here in
 *  the same commit that creates it, not after it has silently shipped unused. */
const MUST_BE_IMPORTED = [
  'src/lib/schemaGenerator.ts',
  'src/lib/personIdentity.ts',
  'src/lib/doNowPlan.ts',
  'src/lib/costEstimate.ts',
  'src/lib/sweepActions.ts',
  'src/lib/claimsSafety.ts',
];

/** Test files do not count as importers — that is exactly the failure mode. */
const isTest = (f) => /__tests__|\.test\.|\.spec\./.test(f);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(full)) out.push(full);
  }
  return out;
}

const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'api')), ...walk(path.join(ROOT, 'scripts'))];
const orphans = [];

for (const target of MUST_BE_IMPORTED) {
  const stem = path.basename(target).replace(/\.tsx?$/, '');
  const importers = files.filter((f) => {
    if (isTest(f)) return false;
    if (path.resolve(f) === path.resolve(ROOT, target)) return false;
    const src = readFileSync(f, 'utf8');
    // matches: from './stem', from '../lib/stem', from '../lib/stem.js'
    return new RegExp(`from\\s+['"][^'"]*/${stem}(\\.js)?['"]`).test(src)
        || new RegExp(`from\\s+['"]\\./${stem}(\\.js)?['"]`).test(src);
  });
  if (importers.length === 0) orphans.push(target);
}

if (orphans.length) {
  console.error('\nBUILD FAILED — module(s) on the schema/plan path have no importer:\n');
  for (const o of orphans) console.error(`  ${o}`);
  console.error('\nA module nothing calls is code on disk, not a feature. Passing tests do not');
  console.error('change that. Wire it into a renderer, or remove it from MUST_BE_IMPORTED in');
  console.error('scripts/check-no-orphan-modules.mjs and say why.\n');
  process.exit(1);
}

console.log(`[orphan-check] ${MUST_BE_IMPORTED.length} modules on the schema/plan path all have importers.`);
