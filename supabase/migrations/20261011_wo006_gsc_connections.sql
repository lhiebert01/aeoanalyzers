-- WO-AEO-POSITION-AND-PANEL-006 Item E — Google Search Console connection (read-only).
-- One row per user: the OAuth refresh token for the webmasters.readonly scope. Server-only:
-- RLS is ON with NO client policy, so the browser can never read a token; api/gsc.ts reads and
-- writes it with the service role. Revocation deletes the row after revoking at Google.
create table if not exists public.gsc_connections (
  user_id       uuid primary key,
  refresh_token text not null,
  scope         text not null,
  connected_at  timestamptz not null default now()
);
alter table public.gsc_connections enable row level security;
-- Server-only (service role): no API access for anon or authenticated (explicit, as required from Oct 30, 2026).
revoke all on public.gsc_connections from anon, authenticated;
grant select, insert, update, delete on public.gsc_connections to service_role;
comment on table public.gsc_connections is 'WO-006: Search Console OAuth refresh tokens, server-only (no client policy).';
