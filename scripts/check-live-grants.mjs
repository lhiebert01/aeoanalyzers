#!/usr/bin/env node
// Live grants guard (founder ruling, Nov 2, 2026). Reads production's actual table grants through the
// Supabase Management API and fails if anon holds any table privilege, or authenticated holds
// anything outside the least-privilege set below (supabase/migrations/20261102_revoke_unneeded_api_grants.sql).
// Needs a Supabase access token: SUPABASE_ACCESS_TOKEN, or the CLI login at ~/.supabase/access-token.
// Without one it says so and exits 0 (CI has no token; the static check:grants still runs there).
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';

export const ALLOWED = {
  users: ['SELECT'],
  analysis_history: ['INSERT', 'SELECT'],
  citation_sweeps: ['SELECT', 'UPDATE'],
  sweep_results: ['SELECT'],
  action_records: ['INSERT', 'SELECT'],
  search_standing: ['INSERT', 'SELECT'],
};

// Column-level writes (supabase/migrations/20261102130000_users_column_writes.sql).
export const COLUMNS = {
  users: { INSERT: ['display_name', 'email', 'id', 'role', 'subscription_status'], UPDATE: ['last_analysis_at', 'usage_count'] },
};

export function violations(rows) {
  const out = [];
  for (const r of rows) {
    if (String(r.kind || '').startsWith('col:')) {
      const priv = r.kind.slice(4);
      if (r.grantee === 'anon') { out.push(`anon holds ${priv} on ${r.table_name}(${r.privs})`); continue; }
      if ((ALLOWED[r.table_name] || []).includes(priv)) continue;
      const ok = (COLUMNS[r.table_name] || {})[priv] || [];
      const extra = String(r.privs).split(',').filter((c) => c && !ok.includes(c));
      if (extra.length) out.push(`authenticated holds ${priv} on ${r.table_name}(${extra.join(', ')}) (allowed columns: ${ok.join(', ') || 'none'})`);
      continue;
    }
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
  const query = `select 'grant' kind, table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) privs from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') group by table_name, grantee
    union all select 'col:' || privilege_type, table_name, grantee, string_agg(column_name, ',' order by column_name) from information_schema.column_privileges where table_schema='public' and grantee in ('anon','authenticated') group by privilege_type, table_name, grantee`;
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  if (!r.ok) { console.error(`check:grants:live: query failed (HTTP ${r.status})`); process.exit(1); }
  const v = violations(await r.json());
  for (const x of v) console.error(`error: ${x}`);
  console.log(`check:grants:live: production grants ${v.length ? `FAIL (${v.length})` : 'match least privilege'}`);
  if (v.length) process.exit(1);
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) main();
