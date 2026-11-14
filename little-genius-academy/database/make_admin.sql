-- =====================================================================
-- LITTLE GENIUS ACADEMY — make_admin.sql
-- Makes YOUR account the website admin (owner), so you can open the Admin area
-- and add stories / hide games without writing SQL.
--
-- HOW TO USE (once):
--   1. Register on the website with your own email (if you have not already).
--   2. Replace  PUT-YOUR-EMAIL-HERE  below with that same email. Keep the quote marks.
--   3. Paste into Supabase > SQL Editor and click Run.
--   4. On the website: Log out, then Log in again. An "Admin" link appears in the menu.
--
-- Safety: the website itself can NEVER make someone an admin. This only works here in the
-- SQL Editor, which only you (the project owner) can open. Never share your Supabase login.
-- To remove admin rights later, run the same thing with 'parent' instead of 'admin'.
-- =====================================================================
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'PUT-YOUR-EMAIL-HERE');

-- Check: this should show your email with role = admin
select u.email, p.role
from public.profiles p join auth.users u on u.id = p.id
where p.role = 'admin';
