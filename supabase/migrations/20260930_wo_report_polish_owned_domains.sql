-- WO-AEO-REPORT-POLISH-001 Lane G2 — founder-confirmable "this is ours" for a flagged domain.
--
-- nybsys-mwc.com was flagged as an entity collision. Founder confirmed Sep 30 2026: it is a
-- Nybsys-owned prototype site. The product must never disclaim a domain the customer owns,
-- and must not auto-decide ownership — so ownership is a per-(user,domain) choice the user
-- makes, persisted where P1-B config memory actually lives: on the citation_sweeps row
-- (query_panels is never written by the app; the config-memory read is the last sweep row).
--
-- Additive, forward-only. Pre-fix rows leave it NULL. RLS gains an owner UPDATE so the
-- toggle can persist from a saved view without a new serverless function.

alter table public.citation_sweeps
  add column if not exists owned_domains text[];

comment on column public.citation_sweeps.owned_domains is
  'WO-AEO-REPORT-POLISH-001 G2: near-name domains the owner confirmed are THEIRS. Excluded from entity-collision findings; rendered as "Owned property" with the 301/noindex-or-link guidance.';

drop policy if exists "owner updates sweeps" on public.citation_sweeps;
create policy "owner updates sweeps" on public.citation_sweeps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- First fixture (founder ruling, Sep 30 2026): nybsys-mwc.com is owned by Nybsys.
-- Scoped to the founder's Nybsys rows; a no-op anywhere else.
update public.citation_sweeps
   set owned_domains = array['nybsys-mwc.com']
 where lower(domain) like 'nybsys.com%'
   and owned_domains is null;
