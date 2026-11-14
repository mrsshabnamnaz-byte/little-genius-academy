# Little Genius Academy — Website online karne ki guide (Beginner)

Maqsad: website ka ek asli link (https://...) banana taa ke aap phone par khol kar bachon ko dikha sakein.
Yeh guide aaram se, ek ek step karein. Kuch toot jaye to ruk kar mujhe screenshot bhejein.

---------------------------------------------------------------
## Step 0: Zaroori baat (keys)
- `js/config.js` mein aapki Supabase **publishable** key hai. Yeh key public hone ke liye hi banai gayi hai
  (website ka code browser mein dikhta hai). Data ko RLS rules bachate hain.
- **Kabhi** `service_role` ya `secret` key kisi bhi file mein na likhein, na GitHub par daalein.
- Aap ki `js/config.js` mein asli keys hain, is liye GitHub par **private** repository banana behtar hai.

---------------------------------------------------------------
## Step 1: Pehle SQL check karein (Supabase > SQL Editor)
In files ko is order mein chalaya hua hona chahiye:
1. database/schema.sql
2. database/policies.sql
3. database/seed.sql
4. database/seed_modules.sql
5. database/achievements.sql   (badges ke liye)
6. database/reports.sql        (reports ke liye)

Agar 5 aur 6 nahi chalayi to ab chala dein (paste -> Run). Dobara chalane se nuksan nahi hota.

Agar chaahein to ab ye bhi chala dein (naye features):
7. database/games_more.sql    (Color Sorter, Shape Builder, Trace and Learn)
8. database/stories.sql       (Stories and Rhymes)
9. database/make_admin.sql    (apne email se; isse aap Admin area khol sakengi. Pehle us mein apna email likhein)

---------------------------------------------------------------
## Step 2: GitHub par bhejein (VS Code se)
1. VS Code mein `little-genius-academy` folder kholein.
2. Left side mein **Source Control** (teesra icon, shakha jaisa) dabayein.
3. **Initialize Repository** dabayein.
4. Message box mein likhein: `First version` aur **Commit** dabayein.
5. **Publish Branch** (ya Publish to GitHub) dabayein, **Private repository** chunein.
6. GitHub login maange to login kar lein.
Nateeja: github.com par aap ki repository ban gayi.
(.gitignore pehle se tayyar hai.)

---------------------------------------------------------------
## Step 3: Netlify par website banayein
1. netlify.com par GitHub se Sign up karein.
2. **Add new site** > **Import an existing project** > **GitHub** chunein, apni repo select karein.
3. Settings: **Build command = khali chhorein**, **Publish directory = `.`** (sirf ek dot).
   (netlify.toml se yeh khud bhi mil jata hai.)
4. **Deploy** dabayein. 1 minute mein link milega, jaise `https://kuch-naam.netlify.app`.
5. (Optional) Site settings > Change site name se achha naam rakh lein.

Aasaan rasta (agar GitHub mushkil lage): Netlify > **Add new site > Deploy manually**,
poora folder drag-drop kar dein.

---------------------------------------------------------------
## Step 4: Supabase ko naya link batayein (BAHUT ZAROORI)
Warna login, password reset aur email ke links nahi chalenge.
1. Supabase > **Authentication** > **URL Configuration**.
2. **Site URL** mein apna Netlify link likhein (https://... bina aakhri slash ke).
3. **Redirect URLs** mein dono add karein:
   - https://aap-ka-link.netlify.app/reset-password.html
   - https://aap-ka-link.netlify.app/**
4. **Save**.
5. Authentication > Providers/Sign In > **Confirm email** launch se pehle **ON** rakhein.

---------------------------------------------------------------
## Step 5: Asli phone par test (checklist)
- [ ] Home page khulta hai, welcome screen aur "Made by Mrs. Shabnam Naz Lakho" nazar aata hai
- [ ] Register, email confirm, login
- [ ] Child profile banana (nickname + avatar)
- [ ] ABC lesson: awaaz aati hai (phone ki silent switch band ho)
- [ ] Game khelna, badge milna, Parent dashboard mein progress
- [ ] "Forgot password" ka email aata hai aur link naye site par khulta hai
- [ ] Ghalat link (jaise /abc) par 404 page aata hai
- [ ] https://aap-ka-link/database/schema.sql kholne par "page not found" aata hai

---------------------------------------------------------------
## Step 6: Launch se pehle
- privacy.html mein **contact email** daalein (jahan "[owner: add a contact email here]" likha hai).
- Privacy page sirf saada draft hai, qanooni mashwara nahi. Doosre mulkon ke bachon ke liye
  (COPPA/GDPR) kisi maahir se review karwa lein.
- Bachon ki asli photo, poora naam ya address kabhi na daalein: sirf nickname.

## Baad mein update kaise karein
Code badlein > VS Code Source Control > Commit > Sync. Netlify khud nayi website bana deta hai.
