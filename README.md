# When Our Paths Cross

A static copy of the "When Our Paths Cross" Lovable app, rebuilt in plain HTML, CSS and JavaScript so it runs on GitHub Pages with no build step.

## Pages
`/` home · `/play` · `/mailbox` · `/moments` · `/chats` · `/availability` · `/friends` · `/world` · `/notifications` (plus `404.html`)

## Backend (Supabase)
Accounts and data are stored in a free Supabase project (`Connections`, region ap-northeast-1).
- **Sign up / sign in** use Supabase Auth with email and password. "Confirm email" is off, so new accounts can sign in straight away.
- **`profiles`**: each account's username, display name and bio. Any signed-in member can search them (no emails are exposed). Usernames are unique.
- **`friendships`**: friend requests. Only the two people involved can see one, only the recipient can accept or decline, and either person can remove it.
- **`moments`**: posts. You see your own, plus posts an *accepted* friend chose to share with you ("Share with" when posting; everyone is ticked by default).
- **`corners`**: everything else that's still private to you (settings, free time, letters, chats, invites, notifications) as one JSON row per account.
- **Security:** Row Level Security is on for every table and was tested with fake users. Signed-out visitors can't read anything.
- The key in `js/app.js` is the *publishable* key, which is meant to be public. Never commit the secret / service_role key.

## Still not shared (yet)
- Letters, chats and catch-up invites save to your own corner only. They don't reach the friend yet.
- New posts appear when the page is refreshed (no live updates).
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
