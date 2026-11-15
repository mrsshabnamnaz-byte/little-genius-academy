-- Little Genius Academy — phonics.sql
-- Adds the "Phonics Sounds" game. The games table only allowed a fixed list of types,
-- so this script first adds 'phonics_sounds' to that list, then adds the game.
-- Run once in Supabase > SQL Editor. Safe to run again.
alter table public.games drop constraint if exists games_game_type_check;
alter table public.games add constraint games_game_type_check check (game_type in
  ('abc_match', 'count_and_win', 'color_sorter', 'shape_builder', 'memory_master',
   'trace_and_learn', 'puzzle_world', 'genius_quiz', 'phonics_sounds'));

insert into public.games (title, description, game_type, learning_level_id, instructions, is_published)
select v.title, v.description, v.game_type, l.id, v.instructions, true
from (values
  ('Phonics Sounds', 'Listen to the letter sound and find the match.', 'phonics_sounds', 'Smart Learners', 'Listen carefully, then tap the letter or picture.')
) as v(title, description, game_type, level, instructions)
join public.learning_levels l on l.name = v.level
on conflict (title) do nothing;
