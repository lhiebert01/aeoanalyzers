import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { check } from '../../scripts/check-migration-grants.mjs';
import { violations, ALLOWED } from '../../scripts/check-live-grants.mjs';

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
    expect(violations([{ table_name: 'users', grantee: 'authenticated', privs: 'INSERT,SELECT,UPDATE' }])).toEqual([]);
  });
  it('the live allowlist is exactly what the revoke migration grants', () => {
    const sql = readFileSync('supabase/migrations/20261102_revoke_unneeded_api_grants.sql', 'utf8');
    const granted: Record<string, string[]> = {};
    for (const m of sql.matchAll(/^grant ([a-z, ]+?)\s+on table public\.([a-z_]+)\s+to authenticated;/gm)) granted[m[2]] = m[1].split(',').map((x) => x.trim().toUpperCase()).sort();
    expect(granted).toEqual(Object.fromEntries(Object.entries(ALLOWED as Record<string, string[]>).map(([k, v]) => [k, [...v].sort()])));
  });
});
