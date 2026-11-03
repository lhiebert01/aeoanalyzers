#!/usr/bin/env node
// Live grants guard (founder ruling, Nov 2, 2026). Reads production's actual table grants through the
// Supabase Management API and fails if anon holds any table privilege, or authenticated holds
// anything outside the least-privilege set below (supabase/migrations/20261102_revoke_unneeded_api_grants.sql).
// Needs a Supabase access token: SUPABASE_ACCESS_TOKEN, or the CLI login at ~/.supabase/access-token.
// Without one it says so and exits 0 (CI has no token; the static check:grants still runs there).
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';

export const ALLOWED = {
  users: ['INSERT', 'SELECT', 'UPDATE'],
  analysis_history: ['INSERT', 'SELECT'],
  citation_sweeps: ['SELECT', 'UPDATE'],
  sweep_results: ['SELECT'],
  action_records: ['INSERT', 'SELECT'],
  search_standing: ['INSERT', 'SELECT'],
};

export function violations(rows) {
  const out = [];
  for (const r of rows) {
    const privs = String(r.privs).split(',').filter(Boolean);
    if (r.grantee === 'anon') { out.push(`anon holds ${privs.join(', ')} on ${r.table_name}`); continue; }
    const allowed = ALLOWED[r.table_name] || [];
    const extra = privs.filter((p) => !allowed.includes(p));
    if (extra.length) out.push(`authenticated holds ${extra.join(', ')} on ${r.table_name} (allowed: ${allowed.join(', ') || 'nothing'})`);
  }
  return out;
}

async function main() {
  const tokenFile = `${homedir()}/.supabase/access-token`;
  const token = process.env.SUPABASE_ACCESS_TOKEN || (existsSync(tokenFile) ? readFileSync(tokenFile, 'utf8').trim() : '');
  if (!token) { console.log('check:grants:live: no Supabase access token here; skipped (run it where the CLI is logged in).'); return; }
  const envUrl = process.env.VITE_SUPABASE_URL || (existsSync('.env') ? (readFileSync('.env', 'utf8').match(/^VITE_SUPABASE_URL=(.*)$/m) || [])[1] : '');
  const ref = String(envUrl || '').replace(/^https?:\/\//, '').split('.')[0];
  if (!ref) { console.error('check:grants:live: no VITE_SUPABASE_URL'); process.exit(1); }
  const query = `select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) privs from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') group by table_name, grantee`;
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  if (!r.ok) { console.error(`check:grants:live: query failed (HTTP ${r.status})`); process.exit(1); }
  const v = violations(await r.json());
  for (const x of v) console.error(`error: ${x}`);
  console.log(`check:grants:live: production grants ${v.length ? `FAIL (${v.length})` : 'match least privilege'}`);
  if (v.length) process.exit(1);
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) main();
