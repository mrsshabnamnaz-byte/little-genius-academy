# Database setup (Supabase) — beginner guide

You will do this **once**. It takes about 15 minutes.

## A. Create your Supabase project
1. Go to https://supabase.com and sign up (free).
2. Click **New project**. Name it `little-genius-academy`.
3. Create and **save** the database password somewhere safe. Never put it in the website code.
4. Pick the region closest to you and click **Create new project**. Wait 1–2 minutes.

## B. Run the three SQL files — in this order
Open your project → left menu → **SQL Editor** → **New query**.

| Order | File          | What it does                                           |
|-------|---------------|--------------------------------------------------------|
| 1     | `schema.sql`  | Builds the tables, rules, and the quiz-grading function |
| 2     | `policies.sql`| Turns on security (Row Level Security)                 |
| 3     | `seed.sql`    | Adds starter levels, subjects, lessons, games, badges  |

For each file: open it in VS Code → select all (Ctrl+A) → copy → paste into the SQL Editor → click **Run**.
You should see **Success. No rows returned**. If you see an error, copy the message and send it to me.
Run each file **once**, in order. (`seed.sql` is safe to run again; the other two are not.)

Check it worked: **Table Editor** → you should see tables such as `children`, `lessons`, and `learning_levels` (3 rows).

## C. Put YOUR keys into the website
Project → **Project Settings** (gear) → **API**. Copy:
- **Project URL**
- **anon / publishable key** (this one is safe to be public)

Paste them into `js/config.js` replacing the two `PASTE_...` texts.

> **NEVER** paste the `service_role` key anywhere in the website files. It bypasses all security.

## D. Authentication settings
**Authentication → Providers → Email**: keep it enabled. For testing you may turn off "Confirm email"; **turn it back on before launch**.
**Authentication → URL Configuration**: later, add your Netlify/Vercel address and `http://127.0.0.1:5500` (Live Server) as allowed redirect URLs.

## E. Make yourself the first admin (later, when we build the admin area)
Register normally on the website first. Then in the SQL Editor run (use your own email):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
```

Only the SQL Editor can do this. Nobody can make themselves admin from the website.

## What the security does (plain English)
- A parent can only see and change **their own** children and their children's progress.
- Quiz **correct answers are hidden**. The website asks the `submit_quiz` function, which checks answers on the server.
- Visitors can only read **published** lessons and games.
- Only admins can create or change learning content or upload to `lesson-media`.
- Nobody can change their own role.

## Not built yet (on purpose)
Screen-time limits (`parent_settings`), stories, certificates, classrooms, audit logs. They come in later phases.

## Notes for later
- Child profile data is minimal: nickname, avatar key, level. No surname, birth date, photo or email.
- A retention/deletion procedure (delete child profile → all records are deleted automatically via `on delete cascade`) is in place; a "delete my account" flow and legal review (COPPA/GDPR) are still to do. This project does **not** claim legal compliance.
