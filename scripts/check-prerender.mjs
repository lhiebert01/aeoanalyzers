// BUILD GATE — fail on the silence, not on the browser.
//
// scripts/prerender.mjs is deliberately fail-open: any route error logs a warning
// and the process exits 0, so a constrained CI container can never break a build.
// That is the right behaviour for a headless browser and the wrong behaviour for a
// deploy, and the gap was not theoretical. In one build on Sep 18 2026 the routes
// /pricing, /guide, /privacy and /terms all timed out and shipped as SPA shells,
// with `npm run build` returning exit 0. /pricing is the page that takes money,
// and nothing anywhere reported it.
//
// So prerender now writes dist/prerender-report.json and this check reads it:
//   - report missing or unparseable  -> FAIL (we cannot tell, which is the silence)
//   - an expected route absent       -> FAIL
//   - an expected route present, not ok -> FAIL
// Fail-open on the browser, fail-closed on the silence.
//
// Prove it by breaking: delete dist/prerender-report.json and run this, or flip an
// entry's `ok` to false. Either exits 1.
//
// SCOPE: this repository's own build only. It is the inward half of the same
// question WO-003/B asks about a customer's site — "does this URL serve its own
// document, or the shell?" — but it answers it from ground truth (did we render
// it?) rather than by inference from bytes and titles, so the code is not shared.
// The customer-facing detector belongs to WO-003/B and will infer.

import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REPORT = path.join(ROOT, 'dist', 'prerender-report.json');

let report;
try {
  report = JSON.parse(readFileSync(REPORT, 'utf8'));
} catch (e) {
  console.error('\nBUILD FAILED — no readable prerender report at dist/prerender-report.json.');
  console.error(`  ${e?.message || e}`);
  console.error('\nThe prerender step exits 0 even when it fails, so an absent report means');
  console.error('we cannot tell what shipped. That is the condition this gate exists for.\n');
  process.exit(1);
}

const expected = report.expected || [];
const rendered = report.rendered || [];
const byPath = new Map(rendered.map((r) => [r.path, r]));
const problems = [];

for (const route of expected) {
  const r = byPath.get(route);
  if (!r) problems.push(`${route} — absent from the report entirely`);
  else if (!r.ok) problems.push(`${route} — reported as failed: ${r.error || '(no reason given)'}`);
}

if (problems.length) {
  console.error(`\nBUILD FAILED — ${problems.length} of ${expected.length} prerendered routes did not ship as their own document:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error('\nEach of these serves the SPA shell instead: HTTP 200, byte-identical to the');
  console.error('homepage, and unreadable to anything that does not run JavaScript. A status');
  console.error('code does not prove a page exists.');
  console.error('\nprerender retries each route once, so this is not a single flake. Re-run the');
  console.error('build; if it persists, the route or its wait marker is broken.\n');
  process.exit(1);
}

console.log(`[prerender-check] all ${expected.length} expected routes shipped their own document.`);
