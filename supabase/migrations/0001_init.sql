-- Worlds 2026 Live: shared source of truth.
-- Run in the Supabase SQL editor (or `supabase db push`). Writes happen only through the
-- server (service role key). The anon key can only read public tables and subscribe to Realtime.

create table if not exists public.matches (
  id text primary key,
  data jsonb not null,
  source text not null check (source in ('lolesports','manual','seed')),
  upstream_changed_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.match_overrides (
  match_id text primary key references public.matches(id) on delete cascade,
  patch jsonb not null,
  author text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recaps (
  match_id text primary key,
  title text not null,
  body text not null,
  kind text not null check (kind in ('editorial','generated')),
  author text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.game_stats (
  match_id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_runs (
  id text primary key,
  started_at timestamptz not null,
  finished_at timestamptz,
  ok boolean not null,
  trigger text not null,
  matches_seen int not null default 0,
  matches_changed int not null default 0,
  attempts int not null default 0,
  error text
);
create index if not exists sync_runs_started_idx on public.sync_runs (started_at desc);

alter table public.matches enable row level security;
alter table public.match_overrides enable row level security;
alter table public.recaps enable row level security;
alter table public.game_stats enable row level security;
alter table public.sync_runs enable row level security;

-- Public read for data that is shown on the site. Overrides and sync history stay private.
create policy "public read matches" on public.matches for select using (true);
create policy "public read recaps" on public.recaps for select using (true);
create policy "public read game_stats" on public.game_stats for select using (true);

-- Realtime: clients subscribe to match changes and re-fetch the snapshot.
alter publication supabase_realtime add table public.matches;
