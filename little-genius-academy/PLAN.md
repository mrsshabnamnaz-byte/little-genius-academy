# Little Genius Academy: Implementation Plan

**Tagline:** Play • Explore • Learn • Grow
**Creator credit (exact text, used everywhere):** Made by Mrs. Shabnam Naz Lakho

## 1. Architecture (in plain words)

```
 Browser (HTML + CSS + vanilla JS + Three.js)
        │  uses the public anon key only
        ▼
 Supabase
   ├─ Auth      → parents log in (children never have passwords)
   ├─ Postgres  → all data; Row Level Security (RLS) decides who sees what
   ├─ Storage   → images and audio
   └─ Edge Functions → anything privileged (checking quiz answers, admin tasks)
 Hosting: Netlify or Vercel (static files) · Code: GitHub
```

Key ideas:
- **RLS** = the database itself refuses to show you rows that are not yours, even if someone tampers with the browser.
- **Quiz answers** live in a private table; the browser asks a database function "is this answer right?" and never receives the answer key.
- **Hybrid 3D**: 3D only on the homepage, world introductions and a few games. Dashboards, forms and reports are plain 2D.
- **Shared header/footer** come from `js/navigation.js`, so every page stays consistent (and the creator credit can never be forgotten).

## 2. Folder structure
See the project tree (matches the master prompt). Extra files added: `coming-soon.html`, `PLAN.md`.

## 3. Page map
- **Public:** Home, About, Learning Levels, Learning World, Activities, Games, Stories, Parent Info, Contact, Login, Register
- **Parent (login required):** Dashboard, Children, Add Child, Progress, Reports, Screen-Time, Settings
- **Child (parent picks a child first):** Dashboard, ABC, Phonics, Numbers, Colors & Shapes, Animals, Matching, Games, Daily Challenge, Achievements
- **Admin (role = admin, enforced by the database):** Dashboard, Users, Lessons, Games, Quizzes, Media, Settings
- **Future:** Teacher, Classrooms, Assignments, Certificates, Analytics

## 4. Database relationships
```
auth.users 1─1 profiles(role) 1─* children *─1 learning_levels
subjects 1─* lessons *─1 learning_levels
lessons 1─* activities · lessons 1─* questions (answers in private table)
children 1─* child_progress *─1 lessons
children 1─* quiz_results · children 1─* game_results *─1 games
children *─* achievements (child_achievements) · daily_challenges *─1 lessons
media_assets (stored files)
```

## 5. Status checklist (updated)
Built and tested (against a mock Supabase and a local Postgres with the real SQL):
- [x] Folder structure, shared header/footer, creator credit on every page
- [x] Homepage (2D, loading screen), About ("Created By"), Learning Levels, Privacy (draft), 404
- [x] Parent registration, login, forgot/reset password
- [x] Parent area: choose child, dashboard, add/edit child (nickname + cartoon avatar), progress, reports, screen time, settings
- [x] Child area: dashboard, ABC, Numbers, Colors & Shapes, Animals, Picture Matching, Stories & Rhymes (illustrated storybook)
- [x] 6 games: ABC Match, Count and Win, Memory Master, Color Sorter, Shape Builder, Trace and Learn
- [x] Daily challenge, badges, sparkle/banner/confetti, mascot "Sparky"
- [x] Progress saved in Supabase; schema.sql, policies.sql (RLS), seeds, achievements.sql, reports.sql, games_more.sql, stories.sql
- [x] Admin area: home (counts, game on/off), lessons & stories (add / edit / hide / delete)
- [x] Deploy files: netlify.toml (security headers), DEPLOY.md

Not done yet:
- [ ] Deployment to Netlify + testing on a real phone (owner steps in DEPLOY.md)
- [ ] 3D homepage (Three.js). threejs/world-scene.js exists but is NOT used by any page yet
- [ ] Genius Quiz (database function submit_quiz exists; no quiz screen yet)
- [ ] Phonics module, Puzzle World game
- [ ] Public pages: Contact, Parent Info
- [ ] Admin: users, quizzes, media uploads, settings
- [ ] Recorded voice for stories (optional: see assets/audio/stories/README.txt)
- [ ] Legal review of the privacy page (COPPA/GDPR) and a security review before a public launch
- [ ] Turn "Confirm email" ON in Supabase before launch

## 6. Software and accounts
VS Code + Live Server extension, a modern browser (Chrome), a free Supabase account, a free GitHub account, a free Netlify or Vercel account. Three.js is loaded from a CDN for now (no install needed).

## 7. Setup (batch 1)
1. Open the `little-genius-academy` folder in VS Code (File → Open Folder).
2. Install the **Live Server** extension.
3. Right-click `index.html` → **Open with Live Server**.
4. Supabase setup comes in batch 3, when we need it.

## 8. Development order
Batch 1 homepage/shell → 2 levels + contact + coming soon → 3 Supabase + auth → 4 children + dashboards → 5 learning modules → 6 games + progress → 7 test, security review, deploy.
