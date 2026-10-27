# Supabase Data API grants snapshot, aeoanalyzers (djrmrbbwfvycjzxfntih)

WO-SUPABASE-GRANTS-001, taken from production on 2026-10-27 after the grants backfill (identical to before it). No secrets.

## Default privileges for new objects in public (owner postgres)

- Behaviour: **still auto-grants (changes on October 30, 2026)**
- Tables (r): anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm
- Sequences (S): anon=rwU, authenticated=rwU, service_role=rwU
- Functions (f): anon=X, authenticated=X, service_role=X

(ACL letters: a insert, r select, w update, d delete, D truncate, x references, t trigger, m maintain, U usage, X execute.)

## Objects in public and their API-role grants

| Object | Kind | RLS | anon | authenticated | service_role |
|---|---|---|---|---|---|
| action_plans | table | on | all | all | all |
| analysis_history | table | on | all | all | all |
| bot_hits | table | on | all | all | all |
| bot_hits_id_seq | sequence | off | SELECT, UPDATE, USAGE | SELECT, UPDATE, USAGE | SELECT, UPDATE, USAGE |
| citation_sweeps | table | on | all | all | all |
| query_panels | table | on | all | all | all |
| sweep_results | table | on | all | all | all |
| truth_records | table | on | all | all | all |
| users | table | on | all | all | all |

## Checks

- Q3, tables anon or authenticated can read with RLS off: none.
- Q6, objects with no API-role grant at all: none.
- Schema drift, production tables no SQL file in the repo creates: none.
- Function EXECUTE grants held by API roles: 6.

The backfill that reproduces these grants on replay: `supabase/migrations/20261027000000_explicit_api_grants_backfill.sql`.
