# When Our Paths Cross

A static copy of the "When Our Paths Cross" Lovable app, rebuilt in plain HTML, CSS and JavaScript so it runs on GitHub Pages with no build step.

## Pages
`/` home · `/play` · `/mailbox` · `/moments` · `/chats` · `/availability` · `/friends` · `/world` · `/notifications` (plus `404.html`)

## Backend (Supabase)
Accounts and data are stored in a free Supabase project (`Connections`, region ap-northeast-1).
- **Sign up / sign in** use Supabase Auth with email and password. "Confirm email" is off, so new accounts can sign in straight away.
- **Your data:** each account has one row in the `corners` table. It holds the profile, settings, letters, moments, free time, chats and invites as JSON.
- **Security:** Row Level Security is on, so a signed-in user can only read and write their own row. Signed-out visitors can't read anything.
- The key in `js/app.js` is the *publishable* key, which is meant to be public. Never commit the secret / service_role key.
- A copy of your corner is cached in the browser so pages open instantly; changes sync to Supabase in the background.

## Still not real (yet)
- Friends are samples. Sarah, Emma and Alex aren't real users, and letters, chats and invites don't reach anyone else.
- Google sign-in and password-reset emails aren't switched on.
- Free Supabase projects pause after a week with no activity. Open the dashboard before a demo.

## Files
- `css/styles.css`: the original Tailwind build, trimmed to the classes the app uses
- `js/app.js`: every page, dialog and action, plus the Supabase connection
- `js/supabase.js`: the Supabase browser library (v2.119.1), bundled so the site doesn't depend on a CDN
- `js/icons.js`: the Lucide icons the app uses
- `assets/`: `friendship-garden.jpg` and `cafe-moment.jpg`

## Publish on GitHub Pages
Put these files at the top level of the repo, then go to Settings → Pages → Deploy from a branch → `main` / root.
