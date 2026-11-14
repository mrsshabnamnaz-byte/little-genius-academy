-- =====================================================================
-- LITTLE GENIUS ACADEMY — reports.sql
-- Adds: screen-time settings per child + a simple log of learning time.
-- Run once in the Supabase SQL Editor (after achievements.sql). Safe to run twice.
-- =====================================================================

-- 1. Daily screen-time limit for each child (set by the parent)
create table if not exists public.child_settings (
  child_id            uuid primary key references public.children (id) on delete cascade,
  daily_limit_minutes smallint check (daily_limit_minutes between 5 and 480),   -- NULL = no limit
  updated_at          timestamptz not null default now()
);
drop trigger if exists trg_child_settings_updated on public.child_settings;
create trigger trg_child_settings_updated before update on public.child_settings
  for each row execute function public.set_updated_at();

-- 2. Learning time log: one row each time a child finishes a lesson or game
create table if not exists public.learning_sessions (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children (id) on delete cascade,
  kind        text not null check (kind in ('lesson', 'game', 'matching')),
  seconds     integer not null check (seconds between 0 and 7200),
  created_at  timestamptz not null default now()
);
create index if not exists idx_sessions_child_time on public.learning_sessions (child_id, created_at desc);

-- 3. Row Level Security: a parent sees and changes only their own children's rows
alter table public.child_settings    enable row level security;
alter table public.learning_sessions enable row level security;

drop policy if exists "settings: parent read"   on public.child_settings;
drop policy if exists "settings: parent insert" on public.child_settings;
drop policy if exists "settings: parent update" on public.child_settings;
drop policy if exists "settings: admin read"    on public.child_settings;
create policy "settings: parent read"   on public.child_settings for select to authenticated using (public.owns_child(child_id));
create policy "settings: parent insert" on public.child_settings for insert to authenticated with check (public.owns_child(child_id));
create policy "settings: parent update" on public.child_settings for update to authenticated
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));
create policy "settings: admin read"    on public.child_settings for select to authenticated using (public.is_admin());

drop policy if exists "sessions: parent read"   on public.learning_sessions;
drop policy if exists "sessions: parent insert" on public.learning_sessions;
drop policy if exists "sessions: admin read"    on public.learning_sessions;
create policy "sessions: parent read"   on public.learning_sessions for select to authenticated using (public.owns_child(child_id));
create policy "sessions: parent insert" on public.learning_sessions for insert to authenticated with check (public.owns_child(child_id));
create policy "sessions: admin read"    on public.learning_sessions for select to authenticated using (public.is_admin());
