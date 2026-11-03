-- Grants follow-up (Nov 2, 2026): column-level writes on public.users.
-- "Users can update own profile" checks only that the row is the user's own, and authenticated held
-- UPDATE on every column, so a signed-in user could set their own subscription_status (read by
-- api/_lib/entitlement.ts to unlock paid plans) or report_pass_until. The browser writes only:
--   insert  id, email, display_name, role, subscription_status   (src/App.tsx, src/components/Auth.tsx)
--   update  usage_count, last_analysis_at                         (src/App.tsx)
-- Admin rights come from is_admin(email), not the role column. The insert policy now also requires
-- subscription_status 'free' and role 'user' (or 'admin' for the admin emails, as the app sends).
-- No rows read, changed or deleted.

revoke insert, update on table public.users from authenticated;
grant insert (id, email, display_name, role, subscription_status) on table public.users to authenticated;
grant update (usage_count, last_analysis_at) on table public.users to authenticated;

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile" on public.users for insert to authenticated
  with check (
    auth.uid() = id
    and subscription_status = 'free'
    and (role = 'user' or (role = 'admin' and public.is_admin(auth.jwt() ->> 'email')))
  );
