-- BookSeats World Cup 2026 Bracket Pool — Supabase schema
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- This script is IDEMPOTENT: it is safe to run again without errors.

-- ---------- Tables ----------

create table if not exists public.players (
  id          text primary key,            -- client-generated uuid
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.brackets (
  player_id   text primary key references public.players(id) on delete cascade,
  name        text not null,
  data        jsonb not null default '{}'::jsonb,
  submitted   boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table if not exists public.results (
  id          int primary key default 1,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  constraint results_singleton check (id = 1)
);

insert into public.results (id, data) values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- ---------- Realtime ----------
-- Add tables to the realtime publication only if they aren't already members
-- (re-running a plain "alter publication ... add table" errors with 42710).
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='players') then
    alter publication supabase_realtime add table public.players;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='brackets') then
    alter publication supabase_realtime add table public.brackets;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='results') then
    alter publication supabase_realtime add table public.results;
  end if;
end $$;

-- ---------- Access ----------
-- Lightweight, fun internal pool: the browser uses the public anon key.
-- RLS is enabled with permissive policies so the anon key can read/write.
-- (Edits are gated in the app by a per-player token; the admin tab by a shared code.)
-- IMPORTANT: with RLS enabled but no policies, ALL reads/writes are blocked —
-- which makes the leaderboard appear empty. The drop+create below guarantees
-- the policies exist and is safe to re-run.

alter table public.players  enable row level security;
alter table public.brackets enable row level security;
alter table public.results  enable row level security;

drop policy if exists "players_all"  on public.players;
drop policy if exists "brackets_all" on public.brackets;
drop policy if exists "results_all"  on public.results;

create policy "players_all"  on public.players  for all using (true) with check (true);
create policy "brackets_all" on public.brackets for all using (true) with check (true);
create policy "results_all"  on public.results  for all using (true) with check (true);
