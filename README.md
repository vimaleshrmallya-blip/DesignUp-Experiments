# DesignUp 2026 knowledge island

All files sit in one flat folder (no sub-folders), so they upload to GitHub in one go.

- `IslandMatrix.jsx`, `store.js`, `main.jsx`: the app
- `config.js`: your Supabase URL, key and sign-in providers (demo mode until filled in)
- `schema.sql`: run once in Supabase → SQL Editor
- `build.mjs`, `package.json`, `vercel.json`: build and hosting

Vercel: import the repo and Deploy with default settings. Local: `npm install`, then `npm run dev` or `npm run build`.

Sharing and moderation: create a free Supabase project, run `schema.sql` (check the moderator email on its last line), enable Authentication → Providers → Google, set Site URL to your Vercel address, then paste the Project URL and `anon` key into `config.js` and commit. Never commit the `service_role` key.
