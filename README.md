# DesignUp 2026 knowledge island

A rotatable map of the DesignUp 2026 talks. Attendees sign in with Google and add photos and learnings to each talk; a moderator approves everything before it goes public.

Until `public/config.js` has real Supabase values, the site runs in **private demo mode** (everything stays in the visitor's own browser).

## Run it on your computer
```
npm install
npm run dev      # http://localhost:3000
npm run build    # writes the site to dist/
```

## Put it on GitHub
```
git init -b main
git add .
git commit -m "DesignUp 2026 island"
git remote add origin https://github.com/<your-username>/designup-island.git   # create the empty repo on github.com first
git push -u origin main
```

## Deploy on Vercel
1. vercel.com → **Add New → Project** → import the GitHub repo.
2. Leave the settings as they are (`vercel.json` already sets the build command and the `dist` output folder). Click **Deploy**.
3. Every `git push` to `main` redeploys the site automatically.

## Switch on sharing and moderation (Supabase)
1. Create a free project at supabase.com. In **SQL Editor** run all of `supabase/schema.sql` (check the moderator email on its last line first).
2. **Authentication → Providers → Google**: switch it on with a Google OAuth client ID and secret.
   - console.cloud.google.com → APIs & Services → OAuth consent screen, then Credentials → Create OAuth client ID → Web application.
   - Add the callback URL that Supabase shows you as an authorised redirect URI.
3. **Authentication → URL Configuration**: set Site URL to your Vercel address and add it under Redirect URLs.
4. Put the Project URL and `anon` key from **Project Settings → API** into `public/config.js`, commit and push.
   - The `anon` key is public by design. Never commit the `service_role` key.
5. Optional LinkedIn button: enable LinkedIn (OIDC) in Supabase, then set `providers: ["google", "linkedin_oidc"]` in `public/config.js`.

## Moderating
Sign in with Google using the moderator email. A ⚑ button with a count appears top-left. Approve, Reject or Delete anything waiting. New photos and notes stay pending until approved, three different reports hide an item, and each person is limited to 40 photos and 20 notes an hour.

## Layout
- `src/IslandMatrix.jsx`: the map, side panel, sign-in and moderation screens
- `src/store.js`: Supabase layer (falls back to local storage)
- `public/config.js`: your Supabase URL, key and sign-in providers
- `supabase/schema.sql`: tables, access rules, storage, limits
