import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { check } from '../../scripts/check-migration-grants.mjs';
import { violations, ALLOWED, COLUMNS } from '../../scripts/check-live-grants.mjs';

/** Founder ruling (Nov 2, 2026): no TRUNCATE (or REFERENCES, TRIGGER, MAINTAIN, ALL) for the API
 *  roles, nothing at all for anon, and signed-in users only what the app uses. */
describe('grants guard', () => {
  it('a migration that brings TRUNCATE, ALL or any anon grant back fails check:grants', () => {
    expect(check('grant truncate on table public.users to authenticated;').errors.length).toBe(1);
    expect(check('grant all on public.citation_sweeps to authenticated;').errors.length).toBe(1);
    expect(check('grant select on table public.users to anon;').errors.length).toBe(1);
    expect(check('grant select, insert on table public.users to authenticated;').errors).toEqual([]);
  });
  it('the live check fails if production drifts back', () => {
    expect(violations([{ table_name: 'users', grantee: 'authenticated', privs: 'INSERT,SELECT,TRUNCATE,UPDATE' }])).toHaveLength(1);
    expect(violations([{ table_name: 'bot_hits', grantee: 'anon', privs: 'SELECT' }])).toHaveLength(1);
    expect(violations([{ table_name: 'users', grantee: 'authenticated', privs: 'SELECT' }])).toEqual([]);
  });
  it('a signed-in user may insert only the listed users columns and update none (usage_count is server-only)', () => {
    expect(violations([{ kind: 'col:UPDATE', table_name: 'users', grantee: 'authenticated', privs: 'usage_count' }])).toHaveLength(1);
    expect(violations([{ kind: 'col:UPDATE', table_name: 'users', grantee: 'authenticated', privs: 'last_analysis_at' }])).toHaveLength(1);
    expect(violations([{ kind: 'col:INSERT', table_name: 'users', grantee: 'authenticated', privs: 'display_name,email,id,role,subscription_status' }])).toEqual([]);
    const sql = readFileSync('supabase/migrations/20261102130000_users_column_writes.sql', 'utf8');
    expect(sql).toContain('grant insert (id, email, display_name, role, subscription_status) on table public.users to authenticated;');
    expect([...COLUMNS.users.INSERT].sort()).toEqual(['display_name', 'email', 'id', 'role', 'subscription_status']);
    expect((COLUMNS.users as Record<string, string[]>).UPDATE).toBeUndefined();
    const nov21 = readFileSync('supabase/migrations/20261121_server_side_usage_count.sql', 'utf8');
    expect(nov21).toContain('revoke update on table public.users from authenticated;');
    expect(nov21).toMatch(/revoke execute on function public\.increment_usage_count\(uuid\) from public, anon, authenticated;/);
  });
  it('sweep updates may not touch created_at or total_cost_usd (they decide the sweep allowance)', () => {
    expect(violations([{ kind: 'col:UPDATE', table_name: 'citation_sweeps', grantee: 'authenticated', privs: 'created_at,summary' }])).toHaveLength(1);
    expect(violations([{ kind: 'col:UPDATE', table_name: 'citation_sweeps', grantee: 'authenticated', privs: 'total_cost_usd' }])).toHaveLength(1);
    expect(violations([{ kind: 'col:UPDATE', table_name: 'citation_sweeps', grantee: 'authenticated', privs: 'owned_domains,rescore_note,rescored_at,scoring_version,summary' }])).toEqual([]);
    expect(readFileSync('supabase/migrations/20261121_server_side_usage_count.sql', 'utf8')).toContain('grant update (owned_domains, summary, scoring_version, rescored_at, rescore_note) on table public.citation_sweeps to authenticated;');
  });
  it('the live allowlist is exactly what the revoke migration grants', () => {
    const sql = readFileSync('supabase/migrations/20261102_revoke_unneeded_api_grants.sql', 'utf8');
    const granted: Record<string, string[]> = {};
    for (const m of sql.matchAll(/^grant ([a-z, ]+?)\s+on table public\.([a-z_]+)\s+to authenticated;/gm)) granted[m[2]] = m[1].split(',').map((x) => x.trim().toUpperCase()).sort();
    // users is narrowed to SELECT at table level by the column-writes migration that follows.
    const follow = readFileSync('supabase/migrations/20261102130000_users_column_writes.sql', 'utf8');
    if (/revoke insert, update on table public\.users from authenticated/.test(follow)) granted.users = ['SELECT'];
    // citation_sweeps is narrowed to SELECT at table level (column UPDATE) on Nov 21.
    const nov21 = readFileSync('supabase/migrations/20261121_server_side_usage_count.sql', 'utf8');
    if (/revoke update on table public\.citation_sweeps from authenticated/.test(nov21)) granted.citation_sweeps = ['SELECT'];
    expect(granted).toEqual(Object.fromEntries(Object.entries(ALLOWED as Record<string, string[]>).map(([k, v]) => [k, [...v].sort()])));
  });
});
