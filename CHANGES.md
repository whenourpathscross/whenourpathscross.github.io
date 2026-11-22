# Design pass: what changed

Files touched: `js/app.js`, new `css/polish.css`, every page's `index.html` and `404.html` (one extra stylesheet line), `README.md`.

## Requested
- Sign-in pop-up: removed "New here?" and the link now says "Sign up".
- Empty pages (Mailbox, Moments, Chats, My availability, Friends, Home): the big heart sits in a soft circle, and the button is a lavender pill with a normal-sized icon. The old icon was oversized because a rule meant for the heart also hit the button icon.

## Motion and feel
- Pop-ups grow out of the button you clicked (240ms), close faster (140ms), and no longer replay their entrance every time they redraw.
- Wrong password: the pop-up gives a short shake.
- Submit buttons show a spinner while waiting for Supabase.
- Toasts slide in and fade out instead of vanishing. At most 3 show at once.
- Buttons press in slightly. Quick-action cards lift on hover.
- Page entrance and list stagger only run on first load, not after every click.
- "Reduce motion" in system settings turns movement off.

## Layout
- One strong purple button per view: the page's main button stays solid, and empty-state buttons are soft.
- "Upcoming catch-ups" on My availability now says when nothing is planned.
- Hearts at the end of titles no longer wrap onto their own line.

## Phone
- Page title on top, main button full-width underneath, not squeezed side by side.
- Hero text is readable over the garden picture.
- Mailbox and garden cards stack one per row.
- Pop-ups float with rounded corners, and the X no longer overlaps the title.
- Every button is at least 44px tall for thumbs.
- "Sample corner" badge hidden on narrow phones so the header isn't cramped.

## Sign-in card spacing (round 2)
Every gap now comes from one scale, 8 · 13 · 21 · 34 (Fibonacci numbers, each about 1.618× the last), and related things sit closer than unrelated ones:
- 8: label ↔ its box, title ↔ subtitle
- 13: "Come on in" ↔ Sign up / Forgot password
- 21: Google ↔ divider ↔ Email ↔ Password
- 34: card edges, header ↔ form, Password ↔ "Come on in"
- Title 24px ≈ subtitle 15px × 1.618. Every box and button is 44px tall.
This applies to every pop-up, not only sign-in. On phones the card edge steps down one size, to 21.

## Friend search
- The username box has a fixed purple "@" in front, so you only type the name. If someone types or pastes an "@" anyway, it's dropped, so it never shows "@@".

## Full backend (round 3)
- Chats, letters, catch-up invites and free time are now real and reach the other person. Before, they were saved only on the sender's account.
- Chats, letters, invites, friend requests and free time update live without a refresh.
- "Deliver later" letters now really arrive at the chosen time.
- Notifications come from what actually happened: friend requests, letters waiting, invites, and replies to your invites. The bell shows a dot when something is new.
- Overlapping free time with a friend shows up on the home page as a match.

## Chat notifications and shared free time (round 4)
- Unread chats work like the mailbox: a dot next to Chats, an unread count beside the friend, and "X sent you 2 messages" on the bell. Opening the chat clears them.
- My availability now shows your friends' free time, with a "Suggest a catch-up" button that pre-fills the friend and time. The week strip marks days when you (purple) or a friend (green) are free.

## Movable calendar and read ticks (round 5)
- My availability has ← → arrows to move between weeks, and you can click any day. The lists below show that day: your free time, friends' free time, and "Add free time" opens on that date. Purple and green dots still show which days have something.
- Your chat messages show a clock while sending, ✓ once sent, and a purple ✓✓ once your friend has read them.

## Chat time position (round 6)
- The time (and your ✓/✓✓) now sits at the end of the message, like Telegram and WhatsApp: on the same line for short messages, bottom-right of the last line for long ones.
