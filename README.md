# When Our Paths Cross

A static copy of the "When Our Paths Cross" Lovable app, rebuilt in plain HTML, CSS and JavaScript so it runs on GitHub Pages with no build step.

## Pages
`/` home · `/play` · `/mailbox` · `/moments` · `/chats` · `/availability` · `/friends` · `/world` · `/notifications` (plus `404.html`)

## How it differs from the original
The original stored accounts, letters, moments and chats on a Supabase server. This copy has no server. Instead:
- Signing in creates a local corner that's saved in **this browser only** (localStorage). Nothing is sent anywhere.
- Each new corner starts with sample friends: Sarah and Emma are already friends, and Alex has sent a request.
- Friends' free time is generated relative to today, so "Your paths might cross" fills in once you add your own free time (the default slot, tomorrow from 3 to 4 PM, overlaps with theirs).
- "Continue with Google" and password reset show a message instead of running, because they need the original server.

## Files
- `css/styles.css`: the original Tailwind build, trimmed to the classes the app uses
- `js/app.js`: every page, dialog and action
- `js/icons.js`: the Lucide icons the app uses
- `assets/`: `friendship-garden.jpg` and `cafe-moment.jpg`

## Publish on GitHub Pages
Put these files at the top level of the repo, then go to Settings → Pages → Deploy from a branch → `main` / root.
