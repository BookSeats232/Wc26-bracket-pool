-- BookSeats World Cup 2026 Bracket Pool — Supabase schema
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- ---------- Tables ----------

-- One row per player (your coworkers).
create table if not exists public.players (
  id          text primary key,            -- client-generated uuid
  name        text not null,
  created_at  timestamptz not null default now()
);

-- One row per player's bracket. data holds the full picks as JSON.
create table if not exists public.brackets (
  player_id   text primary key references public.players(id) on delete cascade,
  name        text not null,
  data        jsonb not null default '{}'::jsonb,
  submitted   boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- A single shared "official results" row (id is always 1).
create table if not exists public.results (
  id          int primary key default 1,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  constraint results_singleton check (id = 1)
);

insert into public.results (id, data) values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- ---------- Realtime ----------
-- Stream changes to all connected browsers so the leaderboard updates live.
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.brackets;
alter publication supabase_realtime add table public.results;

-- ---------- Access ----------
-- This is a lightweight, fun internal pool that uses the public anon key from the browser.
-- We enable RLS and add permissive policies so the anon key can read/write these tables.
-- (Edits are gated in the app by a per-player token; the admin tab by a shared code.)
-- If you want stricter control, tighten these policies later.

alter table public.players  enable row level security;
alter table public.brackets enable row level security;
alter table public.results  enable row level security;

create policy "players_all"  on public.players  for all using (true) with check (true);
create policy "brackets_all" on public.brackets for all using (true) with check (true);
create policy "results_all"  on public.results  for all using (true) with check (true);
