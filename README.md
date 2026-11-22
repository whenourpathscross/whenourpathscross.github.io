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
- **`messages`**: chats. Only the two people in a chat can read it, and you can only message accepted friends. The recipient marks messages read when they open the chat (unread dots on Chats, the friend, and the bell).
- **`letters`**: letters to friends. A "deliver later" letter stays hidden from the recipient until its delivery time. Only the recipient can mark it opened or saved.
- **`invites`**: catch-up invites. Only the recipient can accept or decline.
- **`slots`**: free time. Friends see it when you tick "visible" and keep "Share my free time" on in your profile.
- **`corners`**: what's private to you (settings, which notifications you've read) as one JSON row per account.
- **Notifications** aren't stored. They're worked out from friend requests, letters waiting and invites.
- **Live updates:** chats, letters, invites, friend requests and free time appear without refreshing (Supabase Realtime). New moments still need a refresh.
- **Security:** Row Level Security is on for every table and was tested with fake users. Signed-out visitors can't read anything.
- The key in `js/app.js` is the *publishable* key, which is meant to be public. Never commit the secret / service_role key.

## Not done yet
- Photos are stored inside the database as text (up to ~2 MB each). Move them to Supabase Storage if people post a lot.
- Google sign-in and password-reset emails aren't switched on.
- Free Supabase projects pause after a week with no activity. Open the dashboard before a demo.

## Files
- `css/styles.css`: the original Tailwind build, trimmed to the classes the app uses
- `js/app.js`: every page, dialog and action, plus the Supabase connection
- `css/polish.css`: design pass (motion, button feedback, empty states, phone layout), loaded after `styles.css`
- `js/supabase.js`: the Supabase browser library (v2.119.1), bundled so the site doesn't depend on a CDN
- `js/icons.js`: the Lucide icons the app uses
- `assets/`: `friendship-garden.jpg` and `cafe-moment.jpg`

## Publish on GitHub Pages
Put these files at the top level of the repo, then go to Settings → Pages → Deploy from a branch → `main` / root.
