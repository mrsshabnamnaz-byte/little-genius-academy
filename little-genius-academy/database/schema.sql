-- =====================================================================
-- LITTLE GENIUS ACADEMY — schema.sql  (run this FIRST)
-- Creates tables, constraints, indexes, triggers and helper functions.
-- Safe to read top to bottom: every table has a short comment.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Shared helper: keep "updated_at" correct automatically
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. profiles — one row per adult account (parent / admin / teacher)
--    Linked 1-to-1 with Supabase's own auth.users table.
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (char_length(full_name) <= 100),
  role        text not null default 'parent' check (role in ('parent', 'admin', 'teacher')),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Helper: is the current logged-in user an admin?
-- SECURITY DEFINER = runs with the owner's rights so it can read profiles
-- without causing an endless loop inside security policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Automatically create a profile when someone registers.
-- IMPORTANT: the role is ALWAYS 'parent'. Anything the browser sends is ignored,
-- so nobody can register themselves as an admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100),
    'parent'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Block role changes by anyone who is not already an admin.
-- (When auth.uid() is null the change comes from the SQL Editor / service role,
--  which is how YOU promote the first admin.)
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'You are not allowed to change roles';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_role_guard before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ---------------------------------------------------------------------
-- 3. Learning content (written by admins, read by everyone when published)
-- ---------------------------------------------------------------------
create table public.learning_levels (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  minimum_age  smallint not null check (minimum_age between 0 and 18),
  maximum_age  smallint not null check (maximum_age between 0 and 18),
  description  text,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  check (maximum_age >= minimum_age)
);

create table public.subjects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  description  text,
  icon_url     text,
  sort_order   integer not null default 0,
  is_active    boolean not null default true
);

create table public.lessons (
  id                uuid primary key default gen_random_uuid(),
  subject_id        uuid not null references public.subjects (id) on delete cascade,
  learning_level_id uuid references public.learning_levels (id) on delete set null,
  title             text not null,
  description       text,
  instructions      text,
  content           jsonb not null default '{}'::jsonb,
  thumbnail_url     text,
  audio_url         text,
  difficulty        smallint not null default 1 check (difficulty between 1 and 5),
  sort_order        integer not null default 0,
  is_published      boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (subject_id, title)
);
create index idx_lessons_subject on public.lessons (subject_id);
create index idx_lessons_level   on public.lessons (learning_level_id);
create trigger trg_lessons_updated before update on public.lessons
  for each row execute function public.set_updated_at();

create table public.activities (
  id             uuid primary key default gen_random_uuid(),
  lesson_id      uuid not null references public.lessons (id) on delete cascade,
  title          text not null,
  activity_type  text not null check (activity_type in
                   ('flashcards', 'matching', 'counting', 'sorting', 'memory', 'tracing', 'quiz', 'story')),
  instructions   text,
  content        jsonb not null default '{}'::jsonb,
  sort_order     integer not null default 0
);
create index idx_activities_lesson on public.activities (lesson_id);

-- Quiz questions. The column "correct_answer" must NEVER reach a child's browser.
-- See policies.sql: this table is admin-only; children use the questions_public
-- view (no answers) and the submit_quiz() function (grades on the server).
create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  lesson_id      uuid references public.lessons (id) on delete cascade,
  activity_id    uuid references public.activities (id) on delete cascade,
  question_text  text not null,
  question_type  text not null default 'multiple_choice'
                   check (question_type in ('multiple_choice', 'true_false', 'count', 'match')),
  options        jsonb not null default '[]'::jsonb,
  correct_answer jsonb not null,
  explanation    text,
  points         smallint not null default 1 check (points between 0 and 100),
  sort_order     integer not null default 0,
  check (lesson_id is not null or activity_id is not null)
);
create index idx_questions_lesson   on public.questions (lesson_id);
create index idx_questions_activity on public.questions (activity_id);
create unique index uq_questions_lesson_order on public.questions (lesson_id, sort_order)
  where lesson_id is not null;

create table public.games (
  id                uuid primary key default gen_random_uuid(),
  title             text not null unique,
  description       text,
  game_type         text not null check (game_type in
                      ('abc_match', 'count_and_win', 'color_sorter', 'shape_builder',
                       'memory_master', 'trace_and_learn', 'puzzle_world', 'genius_quiz')),
  thumbnail_url     text,
  learning_level_id uuid references public.learning_levels (id) on delete set null,
  instructions      text,
  is_published      boolean not null default false
);

create table public.achievements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null unique,
  description  text,
  icon_url     text,
  criteria     jsonb not null default '{}'::jsonb
);

create table public.daily_challenges (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  lesson_id       uuid references public.lessons (id) on delete set null,
  challenge_date  date not null unique,
  is_active       boolean not null default true
);

create table public.media_assets (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  file_path   text not null unique,   -- path inside the Supabase Storage bucket
  media_type  text not null check (media_type in ('image', 'audio', 'video', 'other')),
  alt_text    text,                   -- text alternative for accessibility
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Children and their learning records (PRIVATE — owned by a parent)
-- ---------------------------------------------------------------------
-- Minimum information only: a nickname, an avatar picture key and a level.
-- No surname, no date of birth, no photo, no email.
create table public.children (
  id                uuid primary key default gen_random_uuid(),
  parent_id         uuid not null references public.profiles (id) on delete cascade,
  nickname          text not null check (char_length(btrim(nickname)) between 1 and 30),
  avatar_key        text not null default 'lion' check (char_length(avatar_key) <= 30),
  learning_level_id uuid references public.learning_levels (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_children_parent on public.children (parent_id);
create trigger trg_children_updated before update on public.children
  for each row execute function public.set_updated_at();

-- Does the logged-in user own this child? Used by many policies.
create or replace function public.owns_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.children where id = p_child_id and parent_id = auth.uid()
  );
$$;

-- Parents may have at most 10 child profiles (stops abuse).
create or replace function public.limit_children_per_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.children where parent_id = new.parent_id) >= 10 then
    raise exception 'Maximum of 10 child profiles per parent';
  end if;
  return new;
end;
$$;
create trigger trg_children_limit before insert on public.children
  for each row execute function public.limit_children_per_parent();

create table public.child_progress (
  id                 uuid primary key default gen_random_uuid(),
  child_id           uuid not null references public.children (id) on delete cascade,
  lesson_id          uuid not null references public.lessons (id) on delete cascade,
  status             text not null default 'in_progress'
                       check (status in ('not_started', 'in_progress', 'completed')),
  score              integer not null default 0 check (score >= 0),
  attempts           integer not null default 0 check (attempts >= 0),
  time_spent_seconds integer not null default 0 check (time_spent_seconds between 0 and 86400),
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (child_id, lesson_id)
);
create index idx_progress_child  on public.child_progress (child_id);
create index idx_progress_lesson on public.child_progress (lesson_id);
create trigger trg_progress_updated before update on public.child_progress
  for each row execute function public.set_updated_at();

create table public.quiz_results (
  id               uuid primary key default gen_random_uuid(),
  child_id         uuid not null references public.children (id) on delete cascade,
  lesson_id        uuid not null references public.lessons (id) on delete cascade,
  score            integer not null check (score >= 0),
  total_questions  integer not null check (total_questions >= 0),
  correct_answers  integer not null check (correct_answers >= 0),
  completed_at     timestamptz not null default now(),
  check (correct_answers <= total_questions)
);
create index idx_quiz_child on public.quiz_results (child_id, completed_at desc);

create table public.game_results (
  id                uuid primary key default gen_random_uuid(),
  child_id          uuid not null references public.children (id) on delete cascade,
  game_id           uuid not null references public.games (id) on delete cascade,
  score             integer not null check (score between 0 and 100000),
  duration_seconds  integer not null check (duration_seconds between 0 and 86400),
  completed_at      timestamptz not null default now()
);
create index idx_game_results_child on public.game_results (child_id, completed_at desc);

create table public.child_achievements (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references public.children (id) on delete cascade,
  achievement_id  uuid not null references public.achievements (id) on delete cascade,
  earned_at       timestamptz not null default now(),
  unique (child_id, achievement_id)
);
create index idx_child_ach_child on public.child_achievements (child_id);

-- ---------------------------------------------------------------------
-- 5. Safe view of questions (NO correct answers) for the learning screens
-- ---------------------------------------------------------------------
create view public.questions_public as
  select q.id, q.lesson_id, q.activity_id, q.question_text, q.question_type,
         q.options, q.points, q.sort_order
  from public.questions q
  join public.lessons l on l.id = q.lesson_id
  where l.is_published;

-- ---------------------------------------------------------------------
-- 6. submit_quiz(): grading happens on the SERVER, answers never leave it
--    p_answers example: {"<question-uuid>": "A", "<question-uuid>": 3}
-- ---------------------------------------------------------------------
create or replace function public.submit_quiz(
  p_child_id  uuid,
  p_lesson_id uuid,
  p_answers   jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total   integer := 0;
  v_correct integer := 0;
  v_score   integer := 0;
  q         record;
  v_details jsonb := '[]'::jsonb;
begin
  -- 1. The caller must own this child.
  if auth.uid() is null or not public.owns_child(p_child_id) then
    raise exception 'Not allowed';
  end if;
  -- 2. The lesson must be published.
  if not exists (select 1 from public.lessons where id = p_lesson_id and is_published) then
    raise exception 'Lesson not available';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answers must be a JSON object';
  end if;

  -- 3. Grade every question of the lesson.
  for q in
    select id, correct_answer, points, explanation
    from public.questions
    where lesson_id = p_lesson_id
    order by sort_order
  loop
    v_total := v_total + 1;
    if (p_answers -> q.id::text) = q.correct_answer then
      v_correct := v_correct + 1;
      v_score   := v_score + q.points;
    end if;
    -- Feedback is returned only AFTER the child has answered.
    v_details := v_details || jsonb_build_object(
      'question_id', q.id,
      'is_correct', (p_answers -> q.id::text) = q.correct_answer,
      'explanation', q.explanation
    );
  end loop;

  if v_total = 0 then
    raise exception 'This lesson has no quiz';
  end if;

  insert into public.quiz_results (child_id, lesson_id, score, total_questions, correct_answers)
  values (p_child_id, p_lesson_id, v_score, v_total, v_correct);

  return jsonb_build_object(
    'score', v_score, 'total_questions', v_total,
    'correct_answers', v_correct, 'details', v_details
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Storage buckets (educational images / audio) — created if missing
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-media', 'lesson-media', true, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'audio/mpeg', 'audio/ogg', 'audio/wav']
)
on conflict (id) do nothing;
-- Recommendation: keep any future child-related uploads in a PRIVATE bucket.

-- ---------------------------------------------------------------------
-- 8. Future tables (NOT created yet, on purpose — keeps the MVP simple):
--    classrooms, classroom_students, teachers, assignments,
--    assignment_submissions, stories, certificates, parent_settings
--    (daily screen-time limit), learning_sessions, audit_logs
-- ---------------------------------------------------------------------
