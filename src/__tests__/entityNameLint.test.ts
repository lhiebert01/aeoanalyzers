import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { lintEntityName } from '../lib/entityNameLint';

describe('L-NAME-1: the company is PIGENAI LLC, never "PI GenAI"', () => {
  it('fails public copy, passes the JSON-LD alias and quoted evidence in code comments', () => {
    expect(lintEntityName('public/x/index.html', '<p>founder of PI GenAI LLC</p>')).toHaveLength(1);
    expect(lintEntityName('public/llms.txt', 'Operated by PI-GenAI.')).toHaveLength(1);
    expect(lintEntityName('public/x/index.html', '"alternateName": "PI GenAI LLC",')).toHaveLength(0);
    expect(lintEntityName('src/lib/a.ts', "    alternateName: 'PI GenAI LLC',")).toHaveLength(0);
    expect(lintEntityName('src/lib/a.ts', '// ChatGPT said "She is the founder of PI GenAI LLC."')).toHaveLength(0);
    expect(lintEntityName('src/App.tsx', '  <p>PI GenAI also builds</p>')).toHaveLength(1);
    expect(lintEntityName('public/x/index.html', '<p>PIGENAI LLC</p>')).toHaveLength(0);
  });
  it('the whole published surface passes (the build gate)', () => {
    expect(execSync('npx tsx scripts/lint-entity-name.ts', { encoding: 'utf8' })).toContain('no "PI GenAI"');
  });
});
