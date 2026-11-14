-- =====================================================================
-- LITTLE GENIUS ACADEMY — stories.sql
-- Adds the "Stories and Rhymes" subject with 5 rhymes and 3 short stories.
-- Run once in the Supabase SQL Editor. Safe to run twice.
-- (Twinkle Twinkle, Baa Baa Black Sheep and Humpty Dumpty are traditional
--  rhymes in the public domain. The other texts are original.)
-- =====================================================================
insert into public.subjects (name, description, sort_order, is_active)
values ('Stories and Rhymes', 'Listen to rhymes and short stories.', 5, true)
on conflict (name) do nothing;

insert into public.lessons (subject_id, learning_level_id, title, description, instructions, content, difficulty, sort_order, is_published)
select s.id, l.id, v.title, v.description, v.instructions, v.content::jsonb, v.difficulty, v.sort_order, true
from (values
  ('Stories and Rhymes', 'Tiny Learners', 'Twinkle, Twinkle, Little Star', 'A star rhyme to sing along.', 'Tap 🔊 and sing along!', '{"kind": "rhyme", "pages": [{"emoji": "⭐", "text": "Twinkle, twinkle, little star,\nHow I wonder what you are!"}, {"emoji": "🌙", "text": "Up above the world so high,\nLike a diamond in the sky."}, {"emoji": "🌟", "text": "Twinkle, twinkle, little star,\nHow I wonder what you are!"}]}', 1, 1),
  ('Stories and Rhymes', 'Tiny Learners', 'Baa, Baa, Black Sheep', 'A woolly rhyme about a sheep.', 'Tap 🔊 and sing along!', '{"kind": "rhyme", "pages": [{"emoji": "🐑", "text": "Baa, baa, black sheep,\nHave you any wool?"}, {"emoji": "🧶", "text": "Yes sir, yes sir,\nThree bags full!"}, {"emoji": "🧺", "text": "One for the master,\nOne for the dame,"}, {"emoji": "🏡", "text": "And one for the little boy\nWho lives down the lane."}]}', 1, 2),
  ('Stories and Rhymes', 'Tiny Learners', 'Humpty Dumpty', 'A rhyme about an egg on a wall.', 'Tap 🔊 and sing along!', '{"kind": "rhyme", "pages": [{"emoji": "🥚", "text": "Humpty Dumpty sat on a wall,\nHumpty Dumpty had a great fall."}, {"emoji": "👑", "text": "All the king''s horses\nAnd all the king''s men,"}, {"emoji": "🧩", "text": "Couldn''t put Humpty\nTogether again."}]}', 1, 3),
  ('Stories and Rhymes', 'Tiny Learners', 'Little Raindrop', 'A gentle rain rhyme.', 'Tap 🔊 and sing along!', '{"kind": "rhyme", "pages": [{"emoji": "☁️", "text": "Little raindrop, up so high,\nDancing in the cloudy sky."}, {"emoji": "🌧️", "text": "Down you come, plip, plop, plip,\nSplashing on my umbrella tip!"}, {"emoji": "🌈", "text": "Little raindrop, gone away,\nHello, rainbow! Hip hooray!"}]}', 1, 4),
  ('Stories and Rhymes', 'Tiny Learners', 'Sleepy Moon', 'A sleepy bedtime rhyme.', 'Tap 🔊 and sing along!', '{"kind": "rhyme", "pages": [{"emoji": "🌙", "text": "The sun says bye, the sky goes blue,\nThe moon says hello, and so do you."}, {"emoji": "🧸", "text": "Hug your teddy, close your eyes,\nCount the stars up in the skies."}, {"emoji": "😴", "text": "Sleepy moon, good night, stars,\nSweet dreams from here to Mars."}]}', 1, 5),
  ('Stories and Rhymes', 'Tiny Learners', 'Sunny the Little Duck', 'A duck, a puddle and a new friend.', 'Tap 🔊 to hear it, then tap Next.', '{"kind": "story", "pages": [{"emoji": "🐥", "text": "Sunny is a little yellow duck."}, {"emoji": "🌧️", "text": "One morning, Sunny sees a big, round puddle."}, {"emoji": "💦", "text": "Splash! Sunny jumps in. Splash, splash, splash!"}, {"emoji": "🐸", "text": "Frog hops over. Ribbit! Can I play too?"}, {"emoji": "💛", "text": "Sunny says, \"Yes!\" Now they are both wet and happy. The end."}]}', 1, 6),
  ('Stories and Rhymes', 'Tiny Learners', 'The Red Balloon', 'A balloon floats away, and a smile stays.', 'Tap 🔊 to hear it, then tap Next.', '{"kind": "story", "pages": [{"emoji": "🎈", "text": "Tia has a big red balloon."}, {"emoji": "🌬️", "text": "The wind blows. Whoosh! The balloon floats up and away."}, {"emoji": "😢", "text": "Tia feels sad. She waves goodbye."}, {"emoji": "🐦", "text": "A little bird says, \"Tweet! Look at the sky!\""}, {"emoji": "🌤️", "text": "Tia looks up. The red balloon dances with the clouds. Tia smiles. The end."}]}', 2, 7),
  ('Stories and Rhymes', 'Tiny Learners', 'The Kind Little Cat', 'Sharing makes everyone happy.', 'Tap 🔊 to hear it, then tap Next.', '{"kind": "story", "pages": [{"emoji": "🐱", "text": "Milo the cat has a bowl of milk."}, {"emoji": "🐶", "text": "A hungry puppy comes by. He looks very sad."}, {"emoji": "🥛", "text": "Milo thinks, then says, \"Let''s share!\""}, {"emoji": "🤝", "text": "Milo and the puppy drink the milk together."}, {"emoji": "💖", "text": "Sharing makes a good friend. The end."}]}', 2, 8)
) as v(subject, level, title, description, instructions, content, difficulty, sort_order)
join public.subjects s on s.name = v.subject
join public.learning_levels l on l.name = v.level
on conflict (subject_id, title) do nothing;
