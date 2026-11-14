-- =====================================================================
-- LITTLE GENIUS ACADEMY — seed_modules.sql
-- Adds MORE lessons for ABC (A–Z), Numbers (1–20), Colors, Shapes and Animals.
-- Run once in the Supabase SQL Editor AFTER seed.sql. Safe to run twice.
-- =====================================================================
insert into public.lessons (subject_id, learning_level_id, title, description, instructions, content, difficulty, sort_order, is_published)
select s.id, l.id, v.title, v.description, v.instructions, v.content::jsonb, v.difficulty, v.sort_order, true
from (values
  ('ABC Alphabet World', 'Smart Learners', 'Letters K to O', 'Meet five more letters.', 'Tap a letter to hear it.', '{"items":["K","L","M","N","O"]}', 1, 3),
  ('ABC Alphabet World', 'Smart Learners', 'Letters P to T', 'Meet five more letters.', 'Tap a letter to hear it.', '{"items":["P","Q","R","S","T"]}', 1, 4),
  ('ABC Alphabet World', 'Smart Learners', 'Letters U to Z', 'The last six letters!',  'Tap a letter to hear it.', '{"items":["U","V","W","X","Y","Z"]}', 2, 5),
  ('Number Kingdom', 'Smart Learners', 'Numbers 11 to 15', 'Count from eleven to fifteen.', 'Tap a number to hear it.', '{"items":[11,12,13,14,15]}', 2, 3),
  ('Number Kingdom', 'Smart Learners', 'Numbers 16 to 20', 'Count from sixteen to twenty.', 'Tap a number to hear it.', '{"items":[16,17,18,19,20]}', 3, 4),
  ('Colors and Shapes', 'Tiny Learners', 'More Colors', 'Pink, brown, black and white.', 'Tap a color to hear its name.', '{"items":["pink","brown","black","white"]}', 1, 3),
  ('Colors and Shapes', 'Tiny Learners', 'More Shapes', 'Rectangle, oval and diamond.', 'Tap a shape to hear its name.', '{"items":["rectangle","oval","diamond"]}', 2, 4),
  ('Animal World', 'Tiny Learners', 'Pets', 'Cats, dogs and chickens.', 'Tap an animal to hear its sound.', '{"items":["cat","dog","chicken"]}', 1, 2),
  ('Animal World', 'Tiny Learners', 'Jungle Animals', 'Lion, elephant, monkey and frog.', 'Tap an animal to hear its sound.', '{"items":["lion","elephant","monkey","frog"]}', 2, 3)
) as v(subject, level, title, description, instructions, content, difficulty, sort_order)
join public.subjects s on s.name = v.subject
join public.learning_levels l on l.name = v.level
on conflict (subject_id, title) do nothing;
