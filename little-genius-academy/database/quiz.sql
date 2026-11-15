-- =====================================================================
-- LITTLE GENIUS ACADEMY — quiz.sql
-- Adds the "Genius Quiz" subject with 3 quizzes (5 questions each).
-- Correct answers stay on the server (table questions is admin-only,
-- children use questions_public + submit_quiz). Safe to run twice.
-- =====================================================================
insert into public.subjects (name, description, sort_order, is_active)
values ('Genius Quiz', 'Quick quizzes to test what you know.', 6, true)
on conflict (name) do nothing;

insert into public.lessons (subject_id, learning_level_id, title, description, instructions, content, difficulty, sort_order, is_published)
select s.id, l.id, v.title, v.description, 'Tap the right answer for each question.', '{"kind":"quiz"}'::jsonb, v.difficulty, v.sort_order, true
from (values
  ('Genius Quiz', 'Tiny Learners', 'Number Quiz', 'Count and pick the right number.', 1, 1),
  ('Genius Quiz', 'Tiny Learners', 'Animal Quiz', 'Who says what? Who lives where?', 2, 2),
  ('Genius Quiz', 'Tiny Learners', 'Colors and Shapes Quiz', 'Find the right color or shape.', 2, 3)
) as v(subject, level, title, description, difficulty, sort_order)
join public.subjects s on s.name = v.subject
join public.learning_levels l on l.name = v.level
on conflict (subject_id, title) do nothing;

insert into public.questions (lesson_id, question_text, question_type, options, correct_answer, explanation, points, sort_order)
select les.id, v.question_text, 'multiple_choice', v.options::jsonb, v.correct::jsonb, v.explanation, 1, v.sort_order
from (values
  ('Number Quiz', 'How many fingers on one hand?', '["3", "5", "7"]', '"5"', 'We have 5 fingers on one hand.', 1),
  ('Number Quiz', 'Which number comes after 3?', '["2", "4", "6"]', '"4"', 'After 3 comes 4.', 2),
  ('Number Quiz', 'Count the stars: ⭐⭐⭐', '["2", "3", "4"]', '"3"', 'There are 3 stars.', 3),
  ('Number Quiz', 'Which number is the biggest?', '["2", "5", "4"]', '"5"', '5 is bigger than 2 and 4.', 4),
  ('Number Quiz', 'How many eyes do you have?', '["1", "2", "3"]', '"2"', 'We have 2 eyes.', 5),
  ('Animal Quiz', 'Which animal says Moo?', '["🐮 Cow", "🐱 Cat", "🐶 Dog"]', '"🐮 Cow"', 'A cow says Moo.', 1),
  ('Animal Quiz', 'Which animal can fly?', '["🐟 Fish", "🐦 Bird", "🐢 Turtle"]', '"🐦 Bird"', 'Birds have wings and can fly.', 2),
  ('Animal Quiz', 'Which animal lives in water?', '["🐟 Fish", "🐘 Elephant", "🐑 Sheep"]', '"🐟 Fish"', 'Fish live in water.', 3),
  ('Animal Quiz', 'Which animal says Meow?', '["🐷 Pig", "🐱 Cat", "🐴 Horse"]', '"🐱 Cat"', 'A cat says Meow.', 4),
  ('Animal Quiz', 'Which animal gives us wool?', '["🐑 Sheep", "🦁 Lion", "🐸 Frog"]', '"🐑 Sheep"', 'Wool comes from sheep.', 5),
  ('Colors and Shapes Quiz', 'What color is the sun?', '["Yellow", "Blue", "Green"]', '"Yellow"', 'The sun looks yellow.', 1),
  ('Colors and Shapes Quiz', 'What color is grass?', '["Red", "Green", "Purple"]', '"Green"', 'Grass is green.', 2),
  ('Colors and Shapes Quiz', 'Which shape is round like a ball?', '["Circle", "Square", "Triangle"]', '"Circle"', 'A circle is round.', 3),
  ('Colors and Shapes Quiz', 'How many sides does a triangle have?', '["2", "3", "4"]', '"3"', 'A triangle has 3 sides.', 4),
  ('Colors and Shapes Quiz', 'What color is the sky on a sunny day?', '["Blue", "Pink", "Brown"]', '"Blue"', 'A clear sky is blue.', 5)
) as v(title, question_text, options, correct, explanation, sort_order)
join public.subjects s on s.name = 'Genius Quiz'
join public.lessons les on les.subject_id = s.id and les.title = v.title
on conflict do nothing;
