-- AEO Analyzers: Supabase Database Schema
-- Run this in the Supabase SQL Editor

-- 1. Users table
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user',
  subscription_status text not null default 'free',
  stripe_customer_id text,
  usage_count integer not null default 0,
  last_analysis_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Analysis history table
create table public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  url text not null,
  score integer not null,
  citation_probability integer not null,
  full_result text not null,
  is_duel boolean not null default false,
  competitor_url text,
  competitor_score integer,
  created_at timestamptz not null default now()
);

-- 3. Indexes
create index idx_analysis_history_user_id on public.analysis_history(user_id);
create index idx_analysis_history_created_at on public.analysis_history(created_at desc);
create index idx_users_email on public.users(email);

-- 4. Admin detection function
create or replace function public.is_admin(user_email text)
returns boolean as $$
begin
  return lower(user_email) in ('lindsay.hiebert@gmail.com', 'liindsay.hiebert@gmail.com');
end;
$$ language plpgsql security definer;

-- 5. Row Level Security

-- Enable RLS
alter table public.users enable row level security;
alter table public.analysis_history enable row level security;

-- Users: read own profile
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

-- Users: update own profile
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Users: insert own profile (on signup)
create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Admin: read all users
create policy "Admins can read all users"
  on public.users for select
  using (public.is_admin((select auth.jwt() ->> 'email')));

-- Analysis history: users insert own
create policy "Users can insert own history"
  on public.analysis_history for insert
  with check (auth.uid() = user_id);

-- Analysis history: users read own
create policy "Users can read own history"
  on public.analysis_history for select
  using (auth.uid() = user_id);

-- 6. Auto-update updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_users_updated
  before update on public.users
  for each row execute function public.handle_updated_at();
