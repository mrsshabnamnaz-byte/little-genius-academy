-- =====================================================================
-- LITTLE GENIUS ACADEMY — policies.sql  (run this SECOND, after schema.sql)
-- Row Level Security (RLS): the database itself decides who may see or
-- change each row, no matter what the browser asks for.
-- With RLS ON and no matching policy, the answer is always "no".
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Turn RLS on for every table
-- ---------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.learning_levels    enable row level security;
alter table public.subjects           enable row level security;
alter table public.lessons            enable row level security;
alter table public.activities         enable row level security;
alter table public.questions          enable row level security;
alter table public.games              enable row level security;
alter table public.achievements       enable row level security;
alter table public.daily_challenges   enable row level security;
alter table public.media_assets       enable row level security;
alter table public.children           enable row level security;
alter table public.child_progress     enable row level security;
alter table public.quiz_results       enable row level security;
alter table public.game_results       enable row level security;
alter table public.child_achievements enable row level security;

-- ---------------------------------------------------------------------
-- 2. profiles — you see and edit only YOUR OWN row (admins can see all)
--    Role changes are blocked by a trigger in schema.sql.
--    No INSERT policy: profiles are created only by the signup trigger.
--    No DELETE policy: deleting an account goes through Supabase Auth.
-- ---------------------------------------------------------------------
create policy "profiles: read own"   on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy "profiles: admin update" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. Public learning content — everyone may READ published items only.
--    Only admins may create, change or delete.
-- ---------------------------------------------------------------------
create policy "levels: read active"   on public.learning_levels for select to anon, authenticated
  using (is_active);
create policy "subjects: read active" on public.subjects for select to anon, authenticated
  using (is_active);
create policy "lessons: read published" on public.lessons for select to anon, authenticated
  using (is_published);
create policy "activities: read if lesson published" on public.activities for select to anon, authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.is_published));
create policy "games: read published" on public.games for select to anon, authenticated
  using (is_published);
create policy "achievements: read all" on public.achievements for select to anon, authenticated
  using (true);
create policy "daily challenges: read active" on public.daily_challenges for select to anon, authenticated
  using (is_active);
create policy "media: read all" on public.media_assets for select to anon, authenticated
  using (true);

-- Admin full control of content tables (one policy per table)
do $$
declare t text;
begin
  foreach t in array array[
    'learning_levels', 'subjects', 'lessons', 'activities', 'questions',
    'games', 'achievements', 'daily_challenges', 'media_assets'
  ] loop
    execute format(
      'create policy "%1$s: admin manage" on public.%1$I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. questions — ADMIN ONLY (the only policy above is "admin manage").
--    Children read questions through the questions_public view (no answers)
--    and are graded by the submit_quiz() function.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 5. children — a parent manages ONLY their own children
-- ---------------------------------------------------------------------
create policy "children: parent read"   on public.children for select to authenticated
  using (parent_id = (select auth.uid()));
create policy "children: parent insert" on public.children for insert to authenticated
  with check (parent_id = (select auth.uid()));
create policy "children: parent update" on public.children for update to authenticated
  using (parent_id = (select auth.uid()))
  with check (parent_id = (select auth.uid()));
create policy "children: parent delete" on public.children for delete to authenticated
  using (parent_id = (select auth.uid()));
-- Admins may VIEW children where operationally necessary (support). No editing.
create policy "children: admin read" on public.children for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 6. Progress, quiz results, game results, achievements
--    Visible only through a child the parent owns.
-- ---------------------------------------------------------------------
create policy "progress: parent read"   on public.child_progress for select to authenticated
  using (public.owns_child(child_id));
create policy "progress: parent insert" on public.child_progress for insert to authenticated
  with check (public.owns_child(child_id));
create policy "progress: parent update" on public.child_progress for update to authenticated
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));
create policy "progress: admin read"    on public.child_progress for select to authenticated
  using (public.is_admin());

-- quiz_results: NO insert policy for browsers — only submit_quiz() writes them.
create policy "quiz results: parent read" on public.quiz_results for select to authenticated
  using (public.owns_child(child_id));
create policy "quiz results: admin read"  on public.quiz_results for select to authenticated
  using (public.is_admin());

create policy "game results: parent read"   on public.game_results for select to authenticated
  using (public.owns_child(child_id));
create policy "game results: parent insert" on public.game_results for insert to authenticated
  with check (public.owns_child(child_id));
create policy "game results: admin read"    on public.game_results for select to authenticated
  using (public.is_admin());

-- child_achievements: parents read only. Awarding comes in Phase 2 (server-side).
create policy "child achievements: parent read" on public.child_achievements for select to authenticated
  using (public.owns_child(child_id));
create policy "child achievements: admin manage" on public.child_achievements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 7. Function and view permissions
-- ---------------------------------------------------------------------
revoke all on function public.submit_quiz(uuid, uuid, jsonb) from public, anon;
grant execute on function public.submit_quiz(uuid, uuid, jsonb) to authenticated;

revoke all on function public.owns_child(uuid) from public;
grant execute on function public.owns_child(uuid) to authenticated;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

grant select on public.questions_public to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. Storage policies for the 'lesson-media' bucket
--    Everyone can view files (educational pictures/audio only).
--    Only admins can upload, replace or delete.
-- ---------------------------------------------------------------------
create policy "lesson-media: public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'lesson-media');
create policy "lesson-media: admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-media' and public.is_admin());
create policy "lesson-media: admin update" on storage.objects for update to authenticated
  using (bucket_id = 'lesson-media' and public.is_admin());
create policy "lesson-media: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-media' and public.is_admin());
