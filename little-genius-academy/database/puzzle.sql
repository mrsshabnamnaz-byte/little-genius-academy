-- Little Genius Academy — puzzle.sql
-- Adds the Puzzle World game (patterns and odd-one-out). Run once in Supabase > SQL Editor.
-- Safe to run again: nothing is duplicated.
insert into public.games (title, description, game_type, learning_level_id, instructions, is_published)
select v.title, v.description, v.game_type, l.id, v.instructions, true
from (values
  ('Puzzle World', 'Finish the pattern and find the odd one out.', 'puzzle_world', 'Smart Learners', 'Look carefully, then tap the right answer.')
) as v(title, description, game_type, level, instructions)
join public.learning_levels l on l.name = v.level
on conflict (title) do nothing;
