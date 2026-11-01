// L-NAME-1: fail the build on the retired company spelling "PI GenAI" in public copy.
// Walks what the public reads: the site (public/), the app source (src/, tests excluded), the
// page and post generators (scripts/), index.html, README.md and package.json.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { lintEntityName } from '../src/lib/entityNameLint';

const files = execSync('git ls-files public src scripts index.html README.md package.json', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !f.includes('__tests__') && /\.(html|txt|xml|json|md|ts|tsx|js|mjs|py|webmanifest)$/.test(f));
const hits = files.flatMap((f) => lintEntityName(f, readFileSync(f, 'utf8')));
if (hits.length) {
  console.error(`L-NAME-1: the company is PIGENAI LLC. ${hits.length} line(s) use the retired "PI GenAI":`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}  ${h.text}`);
  process.exit(1);
}
console.log(`L-NAME-1: ${files.length} files checked, no "PI GenAI" outside the JSON-LD alias.`);
