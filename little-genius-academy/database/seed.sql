-- =====================================================================
-- LITTLE GENIUS ACADEMY — seed.sql  (run this THIRD, after policies.sql)
-- Starter content. No real people or personal data. Safe to run twice.
-- =====================================================================

-- Learning levels --------------------------------------------------------
insert into public.learning_levels (name, minimum_age, maximum_age, description, sort_order) values
  ('Tiny Learners',    2, 3, 'Colors, shapes, picture recognition, animal names and sounds, simple matching.', 1),
  ('Smart Learners',   3, 4, 'Alphabet A–Z, phonics, numbers 1–20, counting, patterns, sorting.', 2),
  ('Genius Explorers', 5, 6, 'Early writing and reading, numbers to 100, addition and subtraction, memory games.', 3)
on conflict (name) do nothing;

-- Subjects (the 5 MVP modules are active; the rest are ready for Phase 2) ----
insert into public.subjects (name, description, sort_order, is_active) values
  ('ABC Alphabet World',  'Meet every letter from A to Z.',            1, true),
  ('Number Kingdom',      'Numbers and counting fun.',                 2, true),
  ('Colors and Shapes',   'A garden full of colors and shapes.',       3, true),
  ('Animal World',        'Animal names and the sounds they make.',    4, true),
  ('Picture Matching',    'Match, sort and remember pictures.',        5, true),
  ('Phonics and Sound Learning',      'Letter sounds and first words.',  6, false),
  ('Tracing and Writing Studio',      'Trace letters and numbers.',      7, false),
  ('Fruits and Vegetables Garden',    'Healthy foods and their names.',  8, false),
  ('My Body and Five Senses',         'Learn about the body and senses.',9, false),
  ('Stories, Rhymes and Listening',   'Stories and songs to enjoy.',    10, false)
on conflict (name) do nothing;

-- Sample lessons -----------------------------------------------------------
-- "content" holds the lesson data the page will use (JSON).
insert into public.lessons (subject_id, learning_level_id, title, description, instructions, content, difficulty, sort_order, is_published)
select s.id, l.id, v.title, v.description, v.instructions, v.content::jsonb, v.difficulty, v.sort_order, true
from (values
  ('ABC Alphabet World', 'Smart Learners',   'Letters A to E',   'Meet the first five letters.',   'Tap a letter to hear it.',
     '{"items":["A","B","C","D","E"]}', 1, 1),
  ('ABC Alphabet World', 'Smart Learners',   'Letters F to J',   'Meet the next five letters.',    'Tap a letter to hear it.',
     '{"items":["F","G","H","I","J"]}', 1, 2),
  ('Number Kingdom',     'Smart Learners',   'Numbers 1 to 5',   'Count from one to five.',        'Tap a number to hear it.',
     '{"items":[1,2,3,4,5]}', 1, 1),
  ('Number Kingdom',     'Smart Learners',   'Numbers 6 to 10',  'Count from six to ten.',         'Tap a number to hear it.',
     '{"items":[6,7,8,9,10]}', 2, 2),
  ('Colors and Shapes',  'Tiny Learners',    'Rainbow Colors',   'Learn the basic colors.',        'Tap a color to hear its name.',
     '{"items":["red","blue","yellow","green","orange","purple"]}', 1, 1),
  ('Colors and Shapes',  'Tiny Learners',    'Friendly Shapes',  'Circle, square and triangle.',   'Tap a shape to hear its name.',
     '{"items":["circle","square","triangle","star","heart"]}', 1, 2),
  ('Animal World',       'Tiny Learners',    'Farm Animals',     'Farm animals and their sounds.', 'Tap an animal to hear its sound.',
     '{"items":["cow","pig","sheep","duck","horse"]}', 1, 1),
  ('Picture Matching',   'Tiny Learners',    'Match the Pairs',  'Find two pictures that match.',  'Tap two cards that look the same.',
     '{"pairs":["apple","ball","cat","dog","sun","star"]}', 1, 1)
) as v(subject, level, title, description, instructions, content, difficulty, sort_order)
join public.subjects s on s.name = v.subject
join public.learning_levels l on l.name = v.level
on conflict (subject_id, title) do nothing;

-- Sample quiz for "Numbers 1 to 5" (correct answers stay private on the server) --
insert into public.questions (lesson_id, question_text, question_type, options, correct_answer, explanation, points, sort_order)
select les.id, v.question_text, 'multiple_choice', v.options::jsonb, v.correct::jsonb, v.explanation, 1, v.sort_order
from (values
  ('Which number comes after 2?',  '[1,3,5]',   '3', 'After 2 comes 3. Great counting!', 1),
  ('Which number is the biggest?', '[2,5,4]',   '5', '5 is bigger than 2 and 4.',        2),
  ('How many fingers on one hand?','[4,5,6]',   '5', 'We have 5 fingers on one hand.',   3)
) as v(question_text, options, correct, explanation, sort_order)
join public.subjects s on s.name = 'Number Kingdom'
join public.lessons les on les.subject_id = s.id and les.title = 'Numbers 1 to 5'
on conflict do nothing;

-- Games (published ones will be built in Phase 1) --------------------------------
insert into public.games (title, description, game_type, learning_level_id, instructions, is_published)
select v.title, v.description, v.game_type, l.id, v.instructions, true
from (values
  ('ABC Match',     'Match each letter with its picture.', 'abc_match',     'Smart Learners',   'Tap the picture that starts with the letter.'),
  ('Count and Win', 'Count the objects and pick the number.', 'count_and_win', 'Smart Learners', 'Count the stars, then tap the right number.'),
  ('Memory Master', 'Flip cards and find the pairs.',      'memory_master', 'Tiny Learners',    'Tap two cards to find a matching pair.')
) as v(title, description, game_type, level, instructions)
join public.learning_levels l on l.name = v.level
on conflict (title) do nothing;

-- Achievements -----------------------------------------------------------------
insert into public.achievements (title, description, criteria) values
  ('First Steps',      'Finished your very first lesson!',   '{"type":"lessons_completed","count":1}'),
  ('Letter Explorer',  'Finished 5 alphabet lessons!',       '{"type":"subject_lessons","subject":"ABC Alphabet World","count":5}'),
  ('Number Star',      'Finished 5 number lessons!',         '{"type":"subject_lessons","subject":"Number Kingdom","count":5}'),
  ('Game Champion',    'Played 10 games!',                   '{"type":"games_played","count":10}'),
  ('Super Learner',    'Finished 10 lessons!',               '{"type":"lessons_completed","count":10}')
on conflict (title) do nothing;
