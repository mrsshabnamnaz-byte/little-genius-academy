-- Little Genius Academy — games_more.sql
-- Adds three new games: Color Sorter, Shape Builder and Trace and Learn.
-- Run once in Supabase > SQL Editor (safe to run again: nothing is duplicated).
insert into public.games (title, description, game_type, learning_level_id, instructions, is_published)
select v.title, v.description, v.game_type, l.id, v.instructions, true
from (values
  ('Color Sorter',  'Name the colour of each picture.',       'color_sorter',  'Tiny Learners',  'Look at the picture and tap its colour.'),
  ('Shape Builder', 'Build a house, a snowman and more!',     'shape_builder', 'Tiny Learners',  'Tap the shapes in the right order to build the picture.'),
  ('Trace and Learn', 'Trace big letters and numbers.',      'trace_and_learn', 'Tiny Learners', 'Use your finger to trace the dotted letter or number.')
) as v(title, description, game_type, level, instructions)
join public.learning_levels l on l.name = v.level
on conflict (title) do nothing;
