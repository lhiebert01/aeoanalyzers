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
// Scope is stated below rather than assumed. It was widened from a hand-listed six to
// all of src/lib after measuring: the wider boundary produces exactly ONE false
// positive, which has a real reason and is exempted by name.
//
// Run by `npm run build` before vite. Prove it by orphaning a module: the build fails.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// THE BOUNDARY, stated so the next person adding a module knows whether it is covered.
//
// SCOPE: every module in `src/lib/`, automatically. Nothing hand-listed.
//
// Why src/lib and not the whole tree. src/lib is the deterministic-core directory by
// this repo's own architecture: pure logic, no framework, no side effects, existing to
// be called by a renderer or a route. A module there with no caller is by definition
// dead. Everything outside it has a legitimate reason to have no in-repo importer —
// `api/*` handlers are invoked by the platform, `src/main.tsx` is the entry point,
// `scripts/*` are invoked by npm or a human, and components are reached through JSX
// rather than a bare `from` path. A guard that fires on those gets switched off, which
// is worse than a narrow one.
//
// The earlier version hand-listed six modules. That was arbitrary: a NEW module on this
// path was uncovered unless someone remembered to add it, which is the same
// remembering-based failure the guard exists to replace. Automatic scope removes that.
//
// EXEMPTIONS must name a reason. There is one, and it is a real category rather than a
// convenience: a module whose intended caller IS a test.
const EXEMPT = {
  'src/lib/pickRate.ts':
    'Its only importer, api/pick-rate.ts, is listed in .vercelignore to stay under the Hobby ' +
    '12-function cap, so it is genuinely dead in production. Kept in the repo deliberately; the ' +
    'endpoint is re-enabled by removing that line. Exempted Sep 8 2026 after a CI build correctly ' +
    'failed on it — do NOT remove this exemption without first re-enabling the endpoint.',
  'src/lib/voiceLint.ts':
    'Enforcement module: it lints published copy for hype, and its caller is deliberately a test ' +
    '(src/__tests__/voiceLint.test.ts). Like this guard, the test IS the mechanism. Verified Sep 8 2026.',
};

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

// Evaluate the SAME file set the deployed build sees. `.vercelignore` excludes files
// from the builder, so a module whose only importer is ignored is dead in production
// even though it looks wired locally. That exact disagreement failed a deploy on Sep 8:
// the guard passed here and failed in CI, and CI was right. A guard that disagrees
// between environments is worse than no guard.
const vercelIgnored = (() => {
  try {
    return readFileSync(path.join(ROOT, '.vercelignore'), 'utf8')
      .split('\n').map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.replace(/^\.\//, ''));
  } catch { return []; }
})();
const isDeployIgnored = (f) => {
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  return vercelIgnored.some((pat) => rel === pat || rel.startsWith(pat.replace(/\/$/, '') + '/'));
};

const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'api')), ...walk(path.join(ROOT, 'scripts'))]
  .filter((f) => !isDeployIgnored(f));
const orphans = [];

const inScope = walk(path.join(ROOT, 'src', 'lib'))
  .filter((f) => !isTest(f))
  .map((f) => path.relative(ROOT, f).split(path.sep).join('/'))
  .filter((f) => !(f in EXEMPT));

for (const target of inScope) {
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
  console.error('change that. Wire it into a renderer or a route, or add it to EXEMPT in');
  console.error('scripts/check-no-orphan-modules.mjs WITH A STATED REASON.\n');
  process.exit(1);
}

console.log(`[orphan-check] ${inScope.length} modules in src/lib all have importers (${Object.keys(EXEMPT).length} exempt, each with a stated reason).`);
