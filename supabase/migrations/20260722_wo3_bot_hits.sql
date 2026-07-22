-- WO-3 — AI Crawler Telemetry: captured bot hits (server-side only).
-- Run in the Supabase SQL editor. Additive.

create table if not exists public.bot_hits (
  id          bigint generated always as identity primary key,
  host        text not null,          -- the domain that was crawled
  path        text not null default '/',
  engine      text not null,          -- e.g. "OpenAI (ChatGPT)"
  tier        text not null,          -- live | search | training
  bot_token   text not null,          -- matched UA token, e.g. "GPTBot"
  user_agent  text,
  source      text not null default 'middleware',  -- middleware | wordpress | cloudflare
  created_at  timestamptz not null default now()
);

create index if not exists idx_bot_hits_host_created on public.bot_hits (host, created_at desc);
create index if not exists idx_bot_hits_host_tier on public.bot_hits (host, tier);
create index if not exists idx_bot_hits_host_path on public.bot_hits (host, path);

-- Writes are server-side (service role bypasses RLS). Reads are aggregated
-- server-side too (bot-stats route uses the service key), so keep RLS on with
-- no public policy — the anon browser cannot read raw hit rows.
alter table public.bot_hits enable row level security;
