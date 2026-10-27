#!/usr/bin/env node
// Supabase grants guard (WO-SUPABASE-GRANTS-001). From October 30, 2026, new objects in public get
// no Data API access by default. Every SQL file added after the grants backfill (2026-10-27) must,
// in the same file:
//   - grant the API roles it needs on each public table, view or materialized view it creates;
//   - enable row level security on each public table it creates;
//   - grant usage, select on a sequence when it creates one or adds a serial/bigserial column.
// A new public function without "grant execute" is a warning only (not every function is an RPC).
// Older files are covered by *_explicit_api_grants_backfill.sql and are not checked.
//   node scripts/check-migration-grants.mjs            check the repo
//   node scripts/check-migration-grants.mjs --self-test
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const CUTOFF = Date.parse('2026-10-27T00:00:00Z');

const strip = (sql) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
// A name in public: "public.x", "x" (no schema) or a quoted form. Other schemas are not checked.
const NAME = String.raw`(?:(?:"?public"?)\.)?"?([a-z_][a-z0-9_]*)"?`;
const isPublic = (whole) => !/^\s*"?(?!public)[a-z_][a-z0-9_]*"?\s*\./i.test(whole);

export function check(sqlRaw) {
  const sql = strip(sqlRaw).toLowerCase();
  const errors = [];
  const warnings = [];
  // Every table named in a GRANT ... ON [TABLE] a, public.b TO ... statement.
  const granted = new Set();
  for (const stmt of sql.split(';')) {
    const g = stmt.match(/\bgrant\s[\s\S]*?\bon\s+(?:table\s+)?([\s\S]*?)\s+to\s/);
    if (!g || /^(sequence|function|all|schema)\b/.test(g[1])) continue;
    for (const t of g[1].split(',')) granted.add(t.trim().replace(/"/g, '').replace(/^public\./, ''));
  }
  const grantsOn = (n) => granted.has(n);
  for (const m of sql.matchAll(new RegExp(String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:(materialized)\s+)?(table|view)\s+(?:if\s+not\s+exists\s+)?(\S+)`, 'g'))) {
    const whole = m[3];
    if (!isPublic(whole)) continue;
    const n = whole.replace(/^"?public"?\./, '').replace(/"/g, '').replace(/\(.*$/, '');
    const kind = m[1] ? 'materialized view' : m[2];
    if (!grantsOn(n)) errors.push(`${kind} public.${n} has no GRANT to the API roles it needs`);
    if (m[2] === 'table' && !new RegExp(String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${NAME.replace('([a-z_][a-z0-9_]*)', n)}\s+enable\s+row\s+level\s+security`).test(sql))
      errors.push(`table public.${n} does not enable row level security`);
  }
  const seqGrant = /\bgrant\s+[^;]*\b(usage|select)\b[^;]*\bon\s+(sequence|all\s+sequences)\b/.test(sql);
  if (/\b(big|small)?serial\b/.test(sql) && !seqGrant) errors.push('a serial/bigserial column needs GRANT USAGE, SELECT on its sequence (or use generated always as identity)');
  for (const m of sql.matchAll(new RegExp(String.raw`\bcreate\s+sequence\s+(?:if\s+not\s+exists\s+)?(\S+)`, 'g')))
    if (isPublic(m[1]) && !seqGrant) errors.push(`sequence ${m[1]} has no GRANT USAGE, SELECT`);
  for (const m of sql.matchAll(new RegExp(String.raw`\bcreate\s+(?:or\s+replace\s+)?function\s+(\S+?)\s*\(`, 'g'))) {
    if (!isPublic(m[1])) continue;
    const n = m[1].replace(/^"?public"?\./, '').replace(/"/g, '');
    if (!new RegExp(String.raw`\bgrant\s+execute\s+on\s+function\s+${NAME.replace('([a-z_][a-z0-9_]*)', n)}\b`).test(sql))
      warnings.push(`function public.${n} has no GRANT EXECUTE (fine unless it is called as an RPC)`);
  }
  return { errors, warnings };
}

function selfTest() {
  const good = `create table public.notes (id uuid primary key, n bigserial);
alter table public.notes enable row level security;
create policy "own" on public.notes for select to authenticated using (true);
grant select, insert on public.notes to authenticated;
grant select, insert, update, delete on public.notes to service_role;
grant usage, select on sequence public.notes_n_seq to authenticated;
create view public.note_count as select count(*) from public.notes;
create table tags (id int);
alter table tags enable row level security;
grant select on public.note_count, tags to authenticated;`;
  const bad = `create table if not exists notes (id uuid primary key, n serial);
create or replace function public.bump() returns void language sql as $$ select 1 $$;`;
  const g = check(good);
  const b = check(bad);
  const ok = g.errors.length === 0 && b.errors.length === 3 && b.warnings.length === 1;
  console.log(`self-test: passing fixture ${g.errors.length} errors; failing fixture ${b.errors.length} errors, ${b.warnings.length} warning`);
  for (const e of b.errors) console.log(`  (expected) ${e}`);
  if (!ok) { console.error('self-test FAILED'); process.exit(1); }
  console.log('self-test passed');
}

function main() {
  const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
  const files = [...new Set([...git('ls-files', '*.sql').split('\n'), ...git('ls-files', '--others', '--exclude-standard', '*.sql').split('\n')])]
    .filter((f) => f && !f.includes('node_modules/') && !/_explicit_api_grants_backfill\.sql$/.test(f));
  const tracked = new Set(git('ls-files', '*.sql').split('\n'));
  let failed = 0;
  let checked = 0;
  for (const f of files) {
    if (tracked.has(f)) {
      const added = git('log', '--diff-filter=A', '--follow', '--format=%ct', '--', f).split('\n').filter(Boolean).pop();
      if (added && Number(added) * 1000 < CUTOFF) continue;
    }
    checked++;
    const { errors, warnings } = check(readFileSync(f, 'utf8'));
    for (const w of warnings) console.warn(`warning ${f}: ${w}`);
    for (const e of errors) { console.error(`error ${f}: ${e}`); failed++; }
  }
  console.log(`check:grants: ${checked} SQL file(s) added since 2026-10-27 checked, ${failed} error(s)`);
  if (failed) process.exit(1);
}

// Run only as a command, so other scripts and tests can import check().
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) selfTest();
  else main();
}
