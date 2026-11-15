-- Little Genius Academy — check_setup.sql
-- Run in Supabase > SQL Editor. It only READS (changes nothing).
-- Every row must say "OK". A row that says "MISSING" tells you which file to run.
select item, case when ok then 'OK' else 'MISSING  -> run ' || fix end as status
from (
  values
  ('Weekly report + screen time tables', to_regclass('public.learning_sessions') is not null and to_regclass('public.child_settings') is not null, 'reports.sql'),
  ('Badges function',                    to_regprocedure('public.check_achievements(uuid)') is not null, 'achievements.sql'),
  ('Game: Color Sorter / Shape Builder / Trace', (select count(*) from public.games where game_type in ('color_sorter','shape_builder','trace_and_learn')) = 3, 'games_more.sql'),
  ('Stories and Rhymes (8 lessons)',     (select count(*) from public.lessons l join public.subjects s on s.id = l.subject_id where s.name = 'Stories and Rhymes') >= 8, 'stories.sql'),
  ('Genius Quiz (3 quizzes)',            (select count(*) from public.lessons l join public.subjects s on s.id = l.subject_id where s.name = 'Genius Quiz') >= 3, 'quiz.sql'),
  ('Game: Puzzle World',                 exists (select 1 from public.games where game_type = 'puzzle_world'), 'puzzle.sql'),
  ('Game: Phonics Sounds',               exists (select 1 from public.games where game_type = 'phonics_sounds'), 'phonics.sql'),
  ('An admin account exists',            exists (select 1 from public.profiles where role = 'admin'), 'make_admin.sql')
) as t(item, ok, fix);
