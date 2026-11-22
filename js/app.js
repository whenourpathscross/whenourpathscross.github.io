/* When Our Paths Cross — static clone.
   Rebuilds the original React/Lovable app as plain JS so it runs on GitHub Pages.
   The original saved everything to a Supabase backend; this version keeps your
   corner in this browser (localStorage) and fills it with sample friends. */
(function () {
  "use strict";

  const ROOT = document.body.dataset.root || "./";
  const PAGE = document.body.dataset.page || "home";
  const STORE_KEY = "wopc-corner-v1";
  const IMG = {
    garden: ROOT + "assets/friendship-garden.jpg",
    cafe: ROOT + "assets/cafe-moment.jpg",
  };

  /* ---------- tiny helpers ---------- */
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, cls = "") =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${name}${cls ? " " + cls : ""}" aria-hidden="true">${window.ICONS[name] || ""}</svg>`;
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
  const href = (to) => (to === "/" ? ROOT : ROOT + to.replace(/^\//, "") + "/");
  const timeFmt = (d) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  /* shadcn/ui Button classes (cva + a small tailwind-merge) */
  const BTN_BASE =
    "btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";
  const BTN_VARIANT = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
    outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
    google: "google-button hover:bg-muted",
  };
  const BTN_SIZE = { default: "h-9 px-4 py-2", sm: "h-8 rounded-md px-3 text-xs", lg: "h-10 rounded-md px-8", icon: "h-9 w-9" };
  const GROUPS = [/^h-/, /^w-/, /^px-/, /^py-/, /^justify-/, /^whitespace-/, /^text-(xs|sm|base|lg|xl|2xl|7xl)$/];
  function cn(...parts) {
    const list = parts.filter(Boolean).join(" ").split(/\s+/).filter(Boolean);
    const out = [];
    list.forEach((c) => {
      const g = GROUPS.findIndex((r) => r.test(c));
      if (g > -1) for (let i = out.length - 1; i >= 0; i--) if (GROUPS[g].test(out[i])) out.splice(i, 1);
      out.push(c);
    });
    return out.join(" ");
  }
  function btn({ variant = "default", size = "default", cls = "", attrs = "", html = "", to = null, type = "button" }) {
    const c = cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], cls);
    if (to !== null) return `<a href="${href(to)}" class="${c}" ${attrs}>${html}</a>`;
    return `<button type="${type}" class="${c}" ${attrs}>${html}</button>`;
  }
  const avatar = (name = "You", colour = "pink") => `<span class="avatar ${colour}">${esc(String(name || "You").slice(0, 1).toUpperCase())}</span>`;

  /* ---------- local "backend" ---------- */

  /* ---------- Supabase backend ----------
     Accounts live in Supabase Auth. Each account's corner (profile, settings,
     letters, moments, free time…) is one row in the `corners` table, and Row
     Level Security only lets a signed-in user read or write their own row.
     The key below is the *publishable* key: it is meant to be public.
     Never put the secret / service_role key in this file. */
  const SUPABASE_URL = "https://xmiojspdlglkfmakoodv.supabase.co";
  const SUPABASE_KEY = "sb_publishable_yoU5G1MBBP2nMpoEl4NwSQ_N9iychyz";
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* A copy of your corner is cached in this browser so pages open instantly.
     `dirty` means the latest change hasn't reached Supabase yet (for example
     you clicked to another page mid-save); it gets sent on the next page load. */
  const CACHE_KEY = "wopc-cache-v2";
  const MAX_CORNER_CHARS = 4500000; // the database refuses corners over ~5 MB
  try {
    localStorage.removeItem(STORE_KEY); // the old browser-only corners
  } catch (e) {}
  function readCache() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY)) || null;
    } catch (e) {
      return null;
    }
  }
  function writeCache(dirty) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ uid: db.user?.id, dirty, data: db }));
    } catch (e) {
      /* cache full: fine, Supabase still has the real copy */
    }
  }
  function clearCache() {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (e) {}
  }

  const cached = readCache();
  let db = cached?.data?.user ? cached.data : {};
  let version = 0;
  let pushing = Promise.resolve();

  function save() {
    if (!db.user) return true;
    if (JSON.stringify(db).length > MAX_CORNER_CHARS) {
      toast("Your corner is full. Try deleting a photo or two ♡");
      return false;
    }
    version++;
    writeCache(true);
    const uid = db.user.id;
    pushing = pushing.then(() => pushCorner(uid)).catch(() => {
      writeCache(true);
      toast("Couldn’t reach your account just now. Your change is kept here and will sync next time.");
    });
    return true;
  }

  async function pushCorner(uid) {
    if (!db.user || db.user.id !== uid) return;
    const sent = version;
    const { error } = await sb.from("corners").upsert({ user_id: uid, data: db, updated_at: new Date().toISOString() });
    if (error) {
      writeCache(true);
      toast("Couldn’t reach your account just now. Your change is kept here and will sync next time.");
      return;
    }
    if (version === sent) writeCache(false);
  }

  const makeUser = (authUser, name) => ({
    id: authUser.id,
    email: authUser.email,
    name,
    username: (name.toLowerCase().replace(/[^a-z0-9_]/g, "") || "friend").slice(0, 30).padEnd(3, "_"),
  });

  /* fetch this account's corner, or make a fresh one on first sign-in */
  async function loadCorner(authUser) {
    const { data, error } = await sb.from("corners").select("data").eq("user_id", authUser.id).maybeSingle();
    if (error) throw error;
    if (data?.data?.user) {
      db = data.data;
      writeCache(false);
      return;
    }
    const name = String(authUser.user_metadata?.name || authUser.email.split("@")[0]).trim() || "Friend";
    db = seedFor(makeUser(authUser, name));
    save();
  }

  /* ---------- shared data: profiles, friendships, moments ----------
     These live in their own Supabase tables so other people can see them.
     Inside the app, your own id is written as "me" so the page code stays simple. */
  let social = { friendships: [], profiles: {}, moments: [], slots: [], letters: [], messages: [], invites: [] };
  const myId = () => db.user?.id;
  const toMe = (id) => (id === myId() ? "me" : id);
  const fromMe = (id) => (id === "me" ? myId() : id);
  const otherOf = (f) => (f.requester_id === "me" ? f.recipient_id : f.requester_id);
  const SAFE_IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

  /* make sure your public profile exists and matches your corner; usernames must be unique */
  async function syncProfile() {
    if (!db.user) return;
    const p = db.profile;
    let username = p.username;
    for (let i = 0; i < 5; i++) {
      const { error } = await sb.from("profiles").upsert({ id: myId(), username, display_name: (p.display_name || "Friend").slice(0, 60), bio: (p.bio || "").slice(0, 250), share_availability: db.settings?.share_availability !== false });
      if (!error) break;
      if (error.code !== "23505" || i === 4) throw error;
      username = `${p.username.slice(0, 25)}_${Math.floor(1000 + Math.random() * 9000)}`;
    }
    if (username !== p.username) {
      p.username = username;
      db.user.username = username;
      save();
    }
  }

  async function loadSocial() {
    if (!db.user) return;
    const withImages = PAGE === "moments";
    const since = new Date(Date.now() - 864e5).toISOString(); // free time and catch-ups from yesterday on
    const [fr, mo, sl, le, me, iv] = await Promise.all([
      sb.from("friendships").select("id, requester_id, recipient_id, status, created_at"),
      sb
        .from("moments")
        .select(withImages ? "id, user_id, caption, mood, image, audience, created_at" : "id, user_id, caption, mood, audience, created_at")
        .order("created_at", { ascending: false })
        .limit(withImages ? 40 : 10),
      sb.from("slots").select("id, user_id, starts_at, ends_at, location, visible").gte("ends_at", since).order("starts_at"),
      sb.from("letters").select("id, sender_id, recipient_id, title, body, stationery, open_when, delivered_at, opened_at, saved, created_at").order("created_at", { ascending: false }).limit(200),
      // shortcut: newest 500 messages across all chats, add per-chat paging if chats get long
      sb.from("messages").select("id, sender_id, recipient_id, body, created_at, read_at").order("created_at", { ascending: false }).limit(500),
      sb.from("invites").select("id, sender_id, recipient_id, starts_at, ends_at, location, status, created_at").gte("ends_at", since).order("starts_at"),
    ]);
    for (const r of [fr, mo, sl, le, me, iv]) if (r.error) throw r.error;
    const ids = new Set();
    fr.data.forEach((f) => ids.add(f.requester_id).add(f.recipient_id));
    mo.data.forEach((m) => ids.add(m.user_id));
    sl.data.forEach((x) => ids.add(x.user_id));
    [...le.data, ...me.data, ...iv.data].forEach((x) => ids.add(x.sender_id).add(x.recipient_id));
    ids.delete(myId());
    const profiles = {};
    if (ids.size) {
      const pr = await sb.from("profiles").select("id, username, display_name, bio").in("id", [...ids]);
      if (pr.error) throw pr.error;
      pr.data.forEach((p) => (profiles[p.id] = p));
    }
    social = {
      profiles,
      friendships: fr.data.map((f) => ({ ...f, requester_id: toMe(f.requester_id), recipient_id: toMe(f.recipient_id) })),
      moments: mo.data.map((m) => ({ ...m, user_id: toMe(m.user_id), image: m.image && SAFE_IMG.test(m.image) ? m.image : null })),
      slots: sl.data.map((x) => ({ ...x, user_id: toMe(x.user_id) })),
      letters: le.data.map(pair),
      messages: me.data.map(pair).reverse(),
      invites: iv.data.map(pair),
    };
  }
  const pair = (x) => ({ ...x, sender_id: toMe(x.sender_id), recipient_id: toMe(x.recipient_id) });

  /* live updates: when something you can see changes, reload and redraw */
  let live = null;
  let liveTimer = null;
  function startLive() {
    if (live || !db.user) return;
    live = sb.channel("my-corner");
    for (const table of ["messages", "letters", "invites", "friendships", "slots"])
      live.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        clearTimeout(liveTimer);
        liveTimer = setTimeout(async () => {
          try {
            await loadSocial();
            redrawKeepingTyping();
            if (dlg?.action === "read-letter") renderDialog();
          } catch (e) {}
        }, 250);
      });
    live.subscribe();
  }
  function stopLive() {
    if (live) sb.removeChannel(live);
    live = null;
  }
  // a live redraw shouldn't wipe a half-typed chat message
  function redrawKeepingTyping() {
    const input = document.querySelector(".chat-compose input");
    const typing = input && { value: input.value, focused: document.activeElement === input, at: input.selectionStart };
    render();
    const again = typing && document.querySelector(".chat-compose input");
    if (!again) return;
    again.value = typing.value;
    again.form.querySelector("button[type=submit]").disabled = !typing.value.trim();
    if (typing.focused) {
      again.focus();
      again.setSelectionRange(typing.at, typing.at);
    }
  }

  /* run a Supabase change, then reload friends/moments and redraw */
  async function socialChange(run, okMsg) {
    try {
      const { error } = await run();
      if (error) throw error;
      await loadSocial();
      render();
      if (dlg) renderDialog();
      if (okMsg) toast(okMsg);
    } catch (err) {
      toast(err?.message || "Couldn’t do that just now. Please try again.");
    }
  }

  /* after sign-in or on page load: corner, then profile, then friends and moments */
  async function loadEverything(authUser) {
    await loadCorner(authUser);
    try {
      await syncProfile();
      await loadSocial();
      startLive();
    } catch (e) {
      toast("Couldn’t load your friends just now. Try refreshing.");
    }
  }

  /* a brand-new corner: real friends and moments now live in Supabase, so no sample people */
  function seedFor(user) {
    return {
      user,
      profile: { id: "me", display_name: user.name, username: user.username, bio: "", location: "", mood: "" },
      settings: { share_availability: true, notifications_enabled: true },
      since: Date.now(),
      friendships: [],
      blocks: [],
      slots: [],
      letters: [],
      moments: [],
      invites: [],
      notifications: [
        { id: "welcome", body: `Welcome! Your username is @${user.username}. Share it so friends can find you ♡`, created_at: new Date().toISOString(), read_at: null },
      ],
      messages: [],
    };
  }


  /* mirrors the shape the original provider gave every page */
  function getData() {
    if (!db.user) return null;
    const blocked = new Set(db.blocks || []);
    const friendships = social.friendships.filter((f) => !blocked.has(f.requester_id) && !blocked.has(f.recipient_id));
    const friendIds = new Set(friendships.filter((f) => f.status === "accepted").map(otherOf));
    const friends = [...friendIds].map((id) => social.profiles[id]).filter(Boolean);
    const fset = new Set(friends.map((f) => f.id));
    return {
      profile: db.profile,
      friends,
      allProfiles: Object.values(social.profiles),
      friendships,
      slots: social.slots.filter((x) => x.user_id === "me" || fset.has(x.user_id)),
      letters: social.letters.filter((l) => l.sender_id === "me" || !blocked.has(l.sender_id)),
      moments: social.moments.filter((m) => m.user_id === "me" || fset.has(m.user_id)),
      messages: social.messages,
      invites: social.invites.filter((i) => fset.has(i.sender_id) || fset.has(i.recipient_id)),
      notifications: notificationsFor(friendships, blocked),
    };
  }

  const ticks = (m) =>
    m.id.startsWith("tmp-")
      ? `<span class="tick" role="img" aria-label="Sending">${icon("clock")}</span>`
      : `<span class="tick${m.read_at ? " read" : ""}" role="img" aria-label="${m.read_at ? "Read" : "Sent"}">${icon(m.read_at ? "check-check" : "check")}</span>`;

  // friend id -> number of messages from them you haven't opened yet
  function unreadFrom(data) {
    const ids = new Set((data.friends || []).map((f) => f.id));
    const out = new Map();
    for (const m of data.messages) if (m.recipient_id === "me" && !m.read_at && ids.has(m.sender_id)) out.set(m.sender_id, (out.get(m.sender_id) || 0) + 1);
    return out;
  }

  /* notifications aren't stored: they're worked out from requests, letters and invites waiting for you */
  function notificationsFor(friendships, blocked) {
    const name = (id) => social.profiles[id]?.display_name || "A friend";
    const read = new Set(db.readNotifs || []);
    const list = [
      ...friendships.filter((f) => f.status === "pending" && f.recipient_id === "me").map((f) => ({ id: `fr-${f.id}`, body: `${name(f.requester_id)} would love to be friends ♡`, created_at: f.created_at, to: "friends" })),
      ...social.letters.filter((l) => l.recipient_id === "me" && !l.opened_at && !blocked.has(l.sender_id)).map((l) => ({ id: `lt-${l.id}`, body: `A little letter from ${name(l.sender_id)} is waiting 💌`, created_at: l.delivered_at, to: "mailbox" })),
      ...social.invites.filter((i) => i.recipient_id === "me" && i.status === "pending").map((i) => ({ id: `iv-${i.id}`, body: `${name(i.sender_id)} suggested a catch-up on ${new Date(i.starts_at).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`, created_at: i.created_at, to: "availability" })),
      ...[...unreadFrom({ friends: friendships.filter((f) => f.status === "accepted").map((f) => ({ id: otherOf(f) })), messages: social.messages })].map(([id, n]) => {
        const last = social.messages.filter((m) => m.sender_id === id && !m.read_at).at(-1);
        return { id: `ch-${last.id}`, body: `${name(id)} sent you ${n === 1 ? "a message" : n + " messages"} 💬`, created_at: last.created_at, to: "chats" };
      }),
      ...social.invites.filter((i) => i.sender_id === "me" && i.status !== "pending").map((i) => ({ id: `ia-${i.id}-${i.status}`, body: `${name(i.recipient_id)} ${i.status} your catch-up`, created_at: i.created_at, to: "availability" })),
      ...(db.notifications || []).filter((n) => !["n1", "n2", "n3"].includes(n.id)), // n1–n3 were old sample ones
    ];
    return list.map((n) => ({ ...n, read_at: n.read_at || (read.has(n.id) ? true : null) })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  /* overlap of your free time with friends' free time (home "paths might cross") */
  function overlaps(mine, theirs) {
    const out = [];
    mine.forEach((a) => {
      theirs.forEach((b) => {
        const s = Math.max(+new Date(a.starts_at), +new Date(b.starts_at));
        const e = Math.min(+new Date(a.ends_at), +new Date(b.ends_at));
        if (e - s >= 10 * 6e4 && e > Date.now())
          out.push({ user_id: b.user_id, start: s, end: e, minutes: Math.round((e - s) / 6e4), location: b.location || a.location });
      });
    });
    return out.sort((x, y) => x.start - y.start);
  }

  /* ---------- shell ---------- */
  const NAV = [
    { to: "/", page: "home", label: "Home", icon: "house" },
    { to: "/play", page: "play", label: "Play", icon: "gamepad-2" },
    { to: "/mailbox", page: "mailbox", label: "Mailbox", icon: "mail" },
    { to: "/moments", page: "moments", label: "Moments", icon: "camera" },
    { to: "/chats", page: "chats", label: "Chats", icon: "message-circle" },
  ];
  const NAV2 = [
    { to: "/availability", page: "availability", label: "My availability", icon: "calendar-days" },
    { to: "/friends", page: "friends", label: "My friends", icon: "users" },
    { to: "/world", page: "world", label: "Our little world", icon: "sprout" },
  ];

  const brand = () =>
    `<div class="brand"><svg class="brand-mark" viewBox="0 0 44 48" fill="none" aria-hidden="true"><path d="M8 43C8 24 32 28 32 8M36 43C36 24 12 28 12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 4"></path><path d="M22 18C10 9 15 1 22 7C29 1 34 9 22 18Z" fill="currentColor"></path></svg><div><div class="brand-name">When Our<br>Paths Cross <span class="text-primary">♡</span></div></div></div>`;

  function navLink(n, data) {
    const unread = data && ((n.page === "mailbox" && data.letters.some((l) => !l.opened_at && l.recipient_id === "me")) || (n.page === "chats" && unreadFrom(data).size));
    return `<a href="${href(n.to)}" class="nav-link ${PAGE === n.page ? "active" : ""}"${PAGE === n.page ? ' aria-current="page"' : ""}>${icon(n.icon)}<span>${n.label}</span>${unread ? '<span class="ml-auto text-xs">●</span>' : ""}</a>`;
  }

  function shell(content, data) {
    const user = db.user;
    const name = data?.profile?.display_name ?? "You";
    return `<div class="app-shell">
  <aside class="sidebar">
    <a href="${href("/")}" class="no-underline text-foreground">${brand()}</a>
    <p class="brand-tag">Little moments. Lasting friendships.</p>
    <nav>${NAV.map((n) => navLink(n, data)).join("")}</nav>
    <div class="nav-divider"></div>
    <p class="nav-caption">A little more connection</p>
    <div>${NAV2.map((n) => navLink(n, data)).join("")}</div>
    <div class="sidebar-bottom">
      <div class="sidebar-note">${icon("heart", "mx-auto mb-2 size-4 text-primary")}<p>Good friends make<br>ordinary days special.</p></div>
      ${btn({ variant: "ghost", cls: "profile-chip h-auto px-1", attrs: `data-open="${user ? "profile" : "auth"}"`, html: `${avatar(name)}<span class="flex-1"><strong class="block text-xs">${esc(data?.profile?.display_name ?? "Your little corner")}</strong><small class="text-muted-foreground">${user ? "Make yourself at home" : "Come on in ♡"}</small></span>${icon("settings", "size-4")}` })}
    </div>
  </aside>
  <div class="main-shell">
    <header class="topbar">
      <div class="mobile-brand">${brand()}</div>
      <div class="topbar-left">${icon("sun", "size-4")}<span>A little space for your favourite people</span></div>
      <div class="topbar-actions">
        ${!user ? '<span class="preview-badge">Sample corner</span>' : ""}
        ${btn({ variant: "ghost", size: "icon", cls: "bell", to: "/notifications", attrs: `title="Notifications" aria-label="Notifications${data?.notifications.some((n) => !n.read_at) ? " (new)" : ""}"`, html: icon("bell") + (data?.notifications.some((n) => !n.read_at) ? '<span class="bell-dot"></span>' : "") })}
        ${user
          ? btn({ variant: "ghost", size: "icon", attrs: 'data-open="profile"', html: avatar(name) })
          : btn({ variant: "ghost", size: "sm", attrs: 'data-open="auth"', html: `Sign in ${icon("chevron-right")}` })}
      </div>
    </header>
    <main class="page-content" id="main-content">${content}</main>
  </div>
  <nav class="bottom-nav" aria-label="Main navigation">${NAV.map((n) => navLink(n, data)).join("")}</nav>
</div>`;
  }

  const pageHeader = ({ eyebrow, title, subtitle, action }) =>
    `<div class="greeting"><div><p class="eyebrow">${eyebrow}</p><h1 class="page-title">${esc(title).replace(/ ♡$/, "&nbsp;♡")}</h1><p class="page-subtitle">${subtitle}</p></div>${action ?? '<span class="hand greeting-doodle">a little closer ♡</span>'}</div>`;
  const emptyState = ({ title, text, action = "" }) =>
    `<div class="empty-state"><span class="empty-mark">${icon("heart")}</span><h3>${title}</h3><p>${text}</p>${action ? `<div class="empty-action">${action}</div>` : ""}</div>`;

  /* ---------- pages ---------- */
  function homePage(data) {
    const user = db.user;
    const first = data?.profile?.display_name?.split(" ")[0];
    let matches;
    if (user) {
      matches = overlaps(
        data.slots.filter((s) => s.user_id === "me"),
        data.slots.filter((s) => s.user_id !== "me")
      )
        .slice(0, 2)
        .map((m) => ({
          id: m.user_id,
          name: data.friends.find((f) => f.id === m.user_id)?.display_name ?? "A friend",
          time: `${timeFmt(m.start)} – ${timeFmt(m.end)}`,
          location: m.location || "Somewhere together",
          duration: `${m.minutes} min together`,
          when: new Date(m.start).toLocaleDateString([], { month: "short", day: "numeric" }),
        }));
    } else {
      matches = [
        { id: "", name: "Sarah", time: "3:00 – 3:30 PM", location: "Near campus", duration: "30 min together", when: "Today" },
        { id: "", name: "Emma", time: "5:15 – 5:40 PM", location: "Tiong Bahru", duration: "25 min together", when: "Today" },
      ];
    }
    const unread = data ? data.letters.filter((l) => l.recipient_id === "me" && !l.opened_at).length : 0;

    const matchesHtml = matches.length
      ? `<div class="matches-grid">${matches
          .map(
            (n, r) => `<article class="match-card">
  <div class="match-person">${avatar(n.name, r ? "sky" : "lavender")}<div><h3>You + ${esc(n.name)}</h3><p class="mini-label">${n.duration}</p></div><span class="free-badge">${n.when} · free</span></div>
  <p class="detail-line">${icon("clock")}${n.time}</p>
  <p class="detail-line">${icon("map-pin")}${esc(n.location)}</p>
  <div class="match-actions">
    ${btn({ size: "sm", variant: r ? "secondary" : "default", attrs: `data-open="${user ? "invite" : "auth"}" data-target="${user ? n.id : ""}"`, html: `${icon("coffee")}Let’s meet!` })}
    ${btn({ variant: "outline", size: "icon", attrs: `title="Write a letter" data-open="letter" data-target="${user ? n.id : ""}"`, html: icon("mail") })}
    ${btn({ variant: "outline", size: "icon", to: "/play", attrs: 'title="Play a game"', html: icon("gamepad-2") })}
  </div>
</article>`
          )
          .join("")}</div>`
      : emptyState({
          title: "Let’s find a little overlap",
          text: "Add your free time and invite a friend. Your next spontaneous catch-up starts here.",
          action: btn({ size: "sm", attrs: 'data-open="availability"', html: `${icon("plus")}Add free time` }),
        });

    const momentsHtml = user
      ? data.moments.length
        ? `<div class="list-stack">${data.moments
            .slice(0, 3)
            .map(
              (m) =>
                `<div class="list-row"><span class="action-icon pink-bg">${icon("camera")}</span><div><strong>${esc(m.caption)}</strong><p>${m.user_id === "me" ? "You" : esc(data.friends.find((f) => f.id === m.user_id)?.display_name || "A friend")} · ${esc(m.mood)} · ${new Date(m.created_at).toLocaleDateString()}</p></div></div>`
            )
            .join("")}</div>`
        : emptyState({
            title: "The little things belong here",
            text: "A sunny walk, your favourite lunch, a tiny win. Keep your first moment.",
            action: btn({ size: "sm", attrs: 'data-open="moment"', html: `${icon("camera")}Post a moment` }),
          })
      : `<div class="photo-grid">
  <article class="polaroid"><img src="${IMG.cafe}" width="1024" height="1024" loading="lazy" alt="Two iced matcha drinks and flowers at a sunny café"><p class="polaroid-caption">a little matcha moment 🍵</p><div class="polaroid-meta"><span>Sarah · 2h ago</span>${icon("heart", "size-3 text-primary")}</div></article>
  <article class="polaroid"><div class="moment-colour pink-bg">🌷</div><p class="polaroid-caption">stopped to smell the flowers</p><div class="polaroid-meta"><span>Emma · 4h ago</span>${icon("heart", "size-3 text-primary")}</div></article>
  <article class="polaroid"><div class="moment-colour yellow-bg">☁️</div><p class="polaroid-caption">taking the slow way home</p><div class="polaroid-meta"><span>Alex · 5h ago</span>${icon("heart", "size-3 text-primary")}</div></article>
</div>`;

    const happenings = user
      ? `<div class="tiny-event"><span class="action-icon pink-bg">${icon("message-circle")}</span><div><p>A little hello can make a day.</p>${btn({ variant: "link", size: "sm", to: "/chats", html: "Say hi to a friend" })}</div></div>`
      : `<div class="tiny-event"><span class="action-icon yellow-bg">${icon("gamepad-2")}</span><div><p>Sarah is up for a little<br>This or That?</p><small>Sample game invitation</small></div></div>
<div class="tiny-event"><span class="action-icon mint-bg">${icon("sprout")}</span><div><p>A new flower in your<br>friendship garden ♡</p><small>Sample friendship moment</small></div></div>`;

    return `${pageHeader({
      eyebrow: "YOUR LITTLE CORNER",
      title: first ? `Hello, ${first} ♡` : "A little hello, a little closer ♡",
      subtitle: "Your little world is waiting. Let’s make a little room for friendship.",
    })}
<section class="welcome-band"><img src="${IMG.garden}" alt="A little pink cottage surrounded by a blooming friendship garden" width="1536" height="768"><div class="welcome-copy"><span class="hand text-xl text-primary">Little moments. Lasting friendships.</span><h2>Good things grow<br>when our paths cross.</h2><p>A quick coffee, a handwritten note, or just a little “thinking of you”.</p>${btn({ size: "sm", attrs: 'data-open="availability"', html: `${icon("plus")}Add a little free time` })}</div></section>
<div class="dashboard-grid">
  <div>
    <section>
      <div class="section-header"><div><h2>${icon("sparkles")}Your paths might cross</h2><p class="section-hint">A little time together is closer than you think.</p></div>${btn({ variant: "link", size: "sm", to: "/availability", html: `View all${icon("arrow-up-right")}` })}</div>
      ${matchesHtml}
    </section>
    <div class="quick-actions">
      ${btn({ variant: "ghost", cls: "quick-action", attrs: 'data-open="availability"', html: `<span class="action-icon lavender-bg">${icon("calendar-days")}</span>Add free time` })}
      ${btn({ variant: "ghost", cls: "quick-action", attrs: 'data-open="letter"', html: `<span class="action-icon pink-bg">${icon("mail")}</span>Write a letter` })}
      ${btn({ variant: "ghost", cls: "quick-action", attrs: 'data-open="moment"', html: `<span class="action-icon blue-bg">${icon("camera")}</span>Post a moment` })}
      ${btn({ variant: "ghost", cls: "quick-action", to: "/play", html: `<span class="action-icon yellow-bg">${icon("gamepad-2")}</span>Play together` })}
    </div>
    <section>
      <div class="section-header"><div><h2>Life lately <span class="hand text-primary">✧</span></h2><p class="section-hint">Little peeks into your favourite people’s days.</p></div>${btn({ variant: "link", size: "sm", to: "/moments", html: `All moments${icon("arrow-up-right")}` })}</div>
      ${momentsHtml}
    </section>
    <p class="end-note">Friendship doesn’t need big plans. Just little moments. ♡</p>
  </div>
  <aside class="dashboard-side">
    <section class="side-section">
      <div class="section-header"><h2>Your mailbox ${icon("mail", "size-4")}</h2></div>
      <div class="mailbox-card"><div class="envelope">${icon("heart")}</div>
        <h3>${user ? (unread ? `${unread} little letter${unread > 1 ? "s" : ""} waiting` : "Room for a little love") : "A little love, just for you"}</h3>
        <p>${user ? (unread ? "A friend left something from the heart." : "The loveliest notes start with you.") : "“Just a reminder that you make my days a little brighter.”"}</p>
        ${btn({ variant: "outline", size: "sm", cls: "w-full", to: "/mailbox", html: `Open your mailbox${icon("arrow-up-right")}` })}
      </div>
    </section>
    <section class="side-section">
      <div class="section-header"><h2>Our little world ${icon("sprout", "size-4")}</h2></div>
      <div class="world-card"><div class="flex justify-between"><h3>Friendship, in bloom</h3><span>🌼</span></div><p>A little place for the memories<br>you grow together.</p><img src="${IMG.garden}" width="1536" height="768" loading="lazy" alt="A blooming garden beside a pink cottage">${btn({ variant: "ghost", size: "sm", cls: "w-full", to: "/world", html: `Visit your little world${icon("arrow-up-right")}` })}</div>
    </section>
    <section class="side-section">
      <div class="section-header"><h2>Little happenings</h2></div>
      ${happenings}
    </section>
  </aside>
</div>`;
  }

  function friendsPage(data) {
    const header = pageHeader({
      eyebrow: "YOUR FAVOURITE PEOPLE",
      title: "Friendship starts with a hello ♡",
      subtitle: db.user ? `A small circle. A whole lot of love. Your username is @${esc(db.profile.username)}` : "A small circle. A whole lot of love.",
      action: btn({ attrs: 'data-open="friends"', html: `${icon("user-plus")}Add a friend` }),
    });
    if (!db.user)
      return header + emptyState({ title: "Bring your people a little closer", text: "Sign in, choose a username and find your friends.", action: btn({ attrs: 'data-open="auth"', html: "Come on in" }) });
    const other = (f) => (f.requester_id === "me" ? f.recipient_id : f.requester_id);
    const nameOf = (id) => data.allProfiles.find((p) => p.id === id)?.display_name;
    const pending = data.friendships.filter((f) => f.status === "pending");
    return `${header}<h2 class="font-display text-xl mb-4">Friend requests</h2>
<div class="list-stack mb-8">${pending
      .map(
        (t) => `<div class="list-row">${avatar(nameOf(other(t)))}<div class="list-row-main"><strong>${esc(nameOf(other(t)))}</strong><p>${t.requester_id === "me" ? "Your invitation is on its way" : "Sent you a friendship invitation"}</p></div>${
          t.recipient_id === "me"
            ? btn({ size: "sm", attrs: `data-act="friend-accept" data-id="${t.id}"`, html: `${icon("check")}Accept` }) +
              btn({ size: "sm", variant: "ghost", attrs: `data-act="friend-decline" data-id="${t.id}"`, html: "Decline" })
            : btn({ size: "sm", variant: "ghost", attrs: `data-act="friend-cancel" data-id="${t.id}"`, html: "Cancel" })
        }</div>`
      )
      .join("")}</div>
${data.friends.length
      ? `<div class="list-stack">${data.friends
          .map(
            (t) => `<div class="list-row">${avatar(t.display_name)}<div class="list-row-main"><strong>${esc(t.display_name)}</strong><p>@${esc(t.username)} · ${esc(t.bio || "A favourite person ♡")}</p></div>
${btn({ variant: "outline", size: "icon", attrs: `title="Send a little letter" data-open="letter" data-target="${t.id}"`, html: icon("mail") })}
${btn({ variant: "ghost", size: "icon", attrs: `title="Remove friend" data-act="friend-remove" data-id="${t.id}"`, html: icon("trash-2") })}
${btn({ variant: "ghost", size: "icon", attrs: `title="Block friend" data-act="friend-block" data-id="${t.id}"`, html: icon("shield-ban") })}</div>`
          )
          .join("")}</div>`
      : emptyState({ title: "Your circle starts here", text: "Share your username with someone you love, or find them with theirs.", action: btn({ attrs: 'data-open="friends"', html: `${icon("user-plus")}Find a friend` }) })}`;
  }

  function availabilityPage(data) {
    const t = new Date();
    const days = Array.from({ length: 7 }, (_, n) => new Date(t.getFullYear(), t.getMonth(), t.getDate() + ui.weekOffset * 7 + n));
    const ymd = (d) => d.toLocaleDateString("en-CA");
    const day = days.find((d) => ymd(d) === ui.day) || days[0];
    const dayName = day.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
    const allMine = data ? data.slots.filter((s) => s.user_id === "me") : [];
    const allTheirs = data ? data.slots.filter((s) => s.user_id !== "me" && new Date(s.ends_at) > Date.now()).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)) : [];
    const sameDay = (s) => new Date(s.starts_at).toDateString() === day.toDateString();
    const mine = allMine.filter(sameDay);
    const theirs = allTheirs.filter(sameDay);
    const weekLabel = ui.weekOffset === 0 ? "This week" : ui.weekOffset === 1 ? "Next week" : `${days[0].toLocaleDateString([], { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString([], { day: "numeric", month: "short" })}`;
    const onDay = (list, d) => list.some((s) => new Date(s.starts_at).toDateString() === d.toDateString());
    const localInput = (iso) => new Date(new Date(iso) - new Date(iso).getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    const friendName = (id) => data?.friends.find((f) => f.id === id)?.display_name;
    return `${pageHeader({
      eyebrow: "CROSSPATHS",
      title: "A little time, together",
      subtitle: "Leave a little space for something spontaneous.",
      action: btn({ attrs: `data-open="availability" data-start="${ymd(day)}"`, html: `${icon("plus")}Add free time` }),
    })}
<div class="week-nav">${btn({ size: "icon", variant: "ghost", attrs: `data-act="week" data-id="-1" aria-label="Previous week"${ui.weekOffset === 0 ? " disabled" : ""}`, html: icon("chevron-left") })}<strong>${weekLabel}</strong>${btn({ size: "icon", variant: "ghost", attrs: 'data-act="week" data-id="1" aria-label="Next week"', html: icon("chevron-right") })}</div>
<div class="week-strip">${days.map((d) => `<button type="button" class="week-day${d === day ? " selected" : ""}${ymd(d) === ymd(t) ? " is-today" : ""}" data-act="pick-day" data-id="${ymd(d)}" aria-pressed="${d === day}">${d.toLocaleDateString([], { weekday: "short" })}<strong>${d.getDate()}</strong><span class="day-dots">${onDay(allMine, d) ? '<i class="dot-me" title="You’re free"></i>' : ""}${onDay(allTheirs, d) ? '<i class="dot-friend" title="A friend is free"></i>' : ""}</span></button>`).join("")}</div>
<p class="quiet-note day-legend"><i class="dot-me"></i> You’re free <i class="dot-friend"></i> A friend is free</p>
<h2 class="sub-heading">${dayName}</h2>
${mine.length
      ? `<div class="list-stack">${mine
          .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
          .map(
            (s) => `<div class="list-row">${icon("calendar-days", "text-primary")}<div class="list-row-main"><strong>${new Date(s.starts_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} – ${timeFmt(s.ends_at)}</strong><p>${esc(s.location || "Somewhere familiar")} · ${s.visible ? "Shared with friends" : "Only you"}</p></div>${btn({ variant: "ghost", size: "icon", attrs: `title="Delete period" data-act="slot-delete" data-id="${s.id}"`, html: icon("trash-2") })}</div>`
          )
          .join("")}</div>`
      : emptyState({ title: `Free on ${day.toLocaleDateString([], { weekday: "long" })}?`, text: "A spare half-hour can become your favourite part of the day.", action: btn({ attrs: `data-open="availability" data-start="${ymd(day)}"`, html: `${icon("plus")}Add a little free time` }) })}
<h2 class="sub-heading">Your friends’ free time</h2>
${theirs.length
      ? `<div class="list-stack">${theirs
          .map(
            (s) => `<div class="list-row">${avatar(friendName(s.user_id))}<div class="list-row-main"><strong>${esc(friendName(s.user_id) || "A friend")} · ${new Date(s.starts_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} – ${timeFmt(s.ends_at)}</strong><p>${esc(s.location || "Somewhere familiar")}</p></div>${btn({ size: "sm", variant: "outline", attrs: `data-open="invite" data-target="${s.user_id}" data-start="${localInput(s.starts_at)}"`, html: "Suggest a catch-up" })}</div>`
          )
          .join("")}</div>`
      : `<p class="quiet-note">No friends have shared free time on this day${allTheirs.length ? " (the green dots show when they’re free)" : ""}.</p>`}
<h2 class="sub-heading">Upcoming catch-ups &amp; invitations</h2>
${(data?.invites || []).length ? "" : `<p class="quiet-note">No catch-ups planned yet. Suggest one from a friend’s chat ♡</p>`}
<div class="list-stack">${(data?.invites || [])
      .map(
        (i) => `<div class="list-row">${avatar(friendName(i.sender_id === "me" ? i.recipient_id : i.sender_id))}<div class="list-row-main"><strong>${new Date(i.starts_at).toLocaleString()}</strong><p>${esc(i.location || "A little catch-up")} · ${i.status}</p></div>${
          i.status === "pending" && i.recipient_id === "me"
            ? btn({ size: "sm", attrs: `data-act="invite-accept" data-id="${i.id}"`, html: "Accept" }) + btn({ size: "sm", variant: "ghost", attrs: `data-act="invite-decline" data-id="${i.id}"`, html: "Decline" })
            : ""
        }</div>`
      )
      .join("")}</div>`;
  }

  const ui = { mailTab: "Inbox", openLetter: null, chatWith: "", weekOffset: 0, day: "" };

  function mailboxPage(data) {
    const tab = ui.mailTab;
    const list = (data?.letters || []).filter((l) => (tab === "Sent" ? l.sender_id === "me" : l.recipient_id === "me" && (tab !== "Saved" || l.saved)));
    return `${pageHeader({
      eyebrow: "LITTLE LETTERS",
      title: "A little love in your mailbox",
      subtitle: "Some words are worth keeping forever.",
      action: btn({ attrs: 'data-open="letter"', html: `${icon("plus")}Write a letter` }),
    })}
<div class="flex gap-2 mb-7">${["Inbox", "Sent", "Saved"].map((e) => btn({ variant: e === tab ? "secondary" : "ghost", attrs: `data-act="mail-tab" data-id="${e}"`, html: e })).join("")}</div>
${list.length
      ? `<div class="letter-grid">${list
          .map((t) =>
            btn({
              variant: "ghost",
              cls: `letter-card h-auto flex-col whitespace-normal stationery-${paper(t.stationery)}`,
              attrs: `data-act="letter-open" data-id="${t.id}"`,
              html: `<div class="envelope">${icon("heart")}</div><h3>${esc(t.title)}</h3><p>${new Date(t.delivered_at) > Date.now() ? `Arrives ${new Date(t.delivered_at).toLocaleDateString()}` : t.opened_at ? "Opened with love" : "Sealed with love"} · ${new Date(t.created_at).toLocaleDateString()}</p>${t.open_when ? `<p>Open when ${esc(t.open_when)}</p>` : ""}`,
            })
          )
          .join("")}</div>`
      : emptyState({
          title: tab === "Saved" ? "Your memory box is waiting" : "A quiet mailbox, for now",
          text: "Send a little piece of your heart. Your first letter could make someone’s day.",
          action: btn({ attrs: 'data-open="letter"', html: `${icon("mail")}Write a little letter` }),
        })}`;
  }

  function momentsPage(data) {
    const header = pageHeader({
      eyebrow: "LIFE LATELY",
      title: "The little things, kept ♡",
      subtitle: "Not a highlight reel. Just life, lately.",
      action: btn({ attrs: 'data-open="moment"', html: `${icon("plus")}Post a moment` }),
    });
    if (!data?.moments.length)
      return header + emptyState({ title: "There’s beauty in the everyday", text: "Keep a photo, a little thought, a tiny good thing. Share only with the people you choose.", action: btn({ attrs: 'data-open="moment"', html: `${icon("camera")}Keep a moment` }) });
    return `${header}<div class="photo-grid">${data.moments
      .map((t) => {
        const img = t.image;
        const by = t.user_id === "me" ? "You" : data.friends.find((f) => f.id === t.user_id)?.display_name || "A friend";
        return `<article class="polaroid">${img ? `<img src="${esc(img)}" width="500" height="500" loading="lazy" alt="A moment from ${esc(by)}">` : '<div class="moment-colour mint-bg">🌼</div>'}<p class="polaroid-caption">${esc(t.caption)}</p><div class="polaroid-meta"><span>${esc(by)} · ${esc(t.mood)} · ${new Date(t.created_at).toLocaleDateString()}</span>${t.user_id === "me" ? btn({ variant: "ghost", size: "icon", attrs: `title="Delete moment" data-act="moment-delete" data-id="${t.id}"`, html: icon("trash-2") }) : ""}</div></article>`;
      })
      .join("")}</div>`;
  }

  function chatsPage(data) {
    const header = pageHeader({ eyebrow: "CROSSCHAT", title: "A little conversation", subtitle: "No big reason needed. Just say hi." });
    if (!data?.friends.length)
      return header + emptyState({ title: "Your people, one little hello away", text: "Add a friend to start a private conversation.", action: btn({ attrs: 'data-open="friends"', html: `${icon("user-plus")}Find a friend` }) });
    const d = data.friends.some((f) => f.id === ui.chatWith) ? ui.chatWith : data.friends[0].id;
    const f = data.friends.find((x) => x.id === d);
    ui.chatOpen = d;
    const unread = unreadFrom(data);
    const msgs = data.messages.filter((m) => (m.sender_id === "me" && m.recipient_id === d) || (m.sender_id === d && m.recipient_id === "me"));
    return `${header}<div class="chat-layout">
  <div class="chat-friends">${data.friends.map((e) => btn({ variant: e.id === d ? "secondary" : "ghost", cls: "w-full justify-start h-auto py-3", attrs: `data-act="chat-with" data-id="${e.id}"`, html: `${avatar(e.display_name)}${esc(e.display_name)}${unread.get(e.id) && e.id !== d ? `<span class="chat-unread" aria-label="${unread.get(e.id)} unread">${unread.get(e.id)}</span>` : ""}` })).join("")}</div>
  <div class="chat-main">
    <div class="chat-header">${avatar(f.display_name)}<strong class="flex-1">${esc(f.display_name)}</strong>${btn({ size: "icon", variant: "ghost", attrs: `title="Send a letter" data-open="letter" data-target="${d}"`, html: icon("mail") })}${btn({ size: "icon", variant: "ghost", attrs: `title="Suggest a catch-up" data-open="invite" data-target="${d}"`, html: icon("calendar-days") })}</div>
    <div class="chat-bubbles" id="chat-bubbles">${msgs.map((e) => `<div class="message ${e.sender_id === "me" ? "own" : ""}"><p>${esc(e.body)}<small>${timeFmt(e.created_at)}${e.sender_id === "me" ? ticks(e) : ""}</small></p></div>`).join("")}</div>
    <form class="chat-compose" data-form="chat" data-id="${d}"><input aria-label="Message" placeholder="A little hello…" name="body" maxlength="4000" autocomplete="off">${btn({ size: "icon", type: "submit", attrs: 'aria-label="Send message" disabled', html: icon("send") })}</form>
  </div>
</div>`;
  }

  function playPage() {
    const games = [
      { name: "This or That?", icon: "☕", colour: "lavender-bg", text: "Coffee date or midnight supper? Find your little things in common." },
      { name: "Do You Know Me?", icon: "🍓", colour: "pink-bg", text: "Comfort foods, dream trips, little quirks. How well do you know each other?" },
      { name: "Doodle Duel", icon: "✏️", colour: "yellow-bg", text: "A silly sketch. A wild guess. A lovely little laugh." },
      { name: "Photo Quest", icon: "📸", colour: "blue-bg", text: "A tiny adventure in your everyday world." },
      { name: "One-Word Story", icon: "📖", colour: "mint-bg", text: "Two friends. One very unexpected story." },
      { name: "Guess the Memory", icon: "💭", colour: "pink-bg", text: "A little trip down your shared memory lane." },
    ];
    return `${pageHeader({ eyebrow: "CROSSPLAY", title: "A little play, a little closer", subtitle: "A few minutes. A whole lot of laughs." })}
<div class="game-grid">${games.map((e) => `<article class="game-card"><div class="game-art ${e.colour}">${e.icon}</div><h3>${e.name}</h3><p>${e.text}</p>${btn({ variant: "outline", cls: "w-full", attrs: "disabled", html: "Coming in the games phase" })}</article>`).join("")}</div>`;
  }

  function worldPage() {
    return `${pageHeader({ eyebrow: "OUR LITTLE WORLD", title: "Friendship, in bloom ♡", subtitle: "A little home for everything you grow together." })}
<div class="world-scene"><img src="${IMG.garden}" width="1536" height="768" alt="A friendship garden and little cottage"><div class="world-label"><h2>Good things<br>take a little love.</h2><p>Shared gardens and memory jars are coming in the friendship-world phase.</p></div></div>
${emptyState({ title: "Your memories will belong here", text: "Your private letters and moments are ready now. Shared scrapbooks and cosmetic garden rewards are next." })}`;
  }

  function notificationsPage(data) {
    const header = pageHeader({ eyebrow: "LITTLE HAPPENINGS", title: "A little nudge of connection", subtitle: "Just the moments that matter." });
    if (!data?.notifications.length) return header + emptyState({ title: "All quiet in your little corner", text: "No little happenings to catch up on just yet." });
    return `${header}<div class="list-stack">${data.notifications
      .map(
        (t) => `<div class="list-row">${icon("heart", "text-primary")}<div class="list-row-main"><strong>${esc(t.body)}</strong><p>${new Date(t.created_at).toLocaleString()}</p></div>${!t.read_at ? btn({ size: "sm", variant: "ghost", attrs: `data-act="notif-read" data-id="${t.id}"`, html: "Mark read" }) : ""}</div>`
      )
      .join("")}</div>`;
  }

  const PAGES = { home: homePage, friends: friendsPage, availability: availabilityPage, mailbox: mailboxPage, moments: momentsPage, chats: chatsPage, play: playPage, world: worldPage, notifications: notificationsPage };

  /* ---------- dialogs ---------- */
  const TITLES = {
    auth: "Your people are waiting ♡",
    availability: "A little free time",
    letter: "Write a little letter",
    moment: "A moment worth keeping",
    friends: "Find your favourite people",
    profile: "Make yourself at home",
    invite: "Shall our paths cross?",
  };
  const field = (label, attrs) => `<label class="form-field"><span>${label}</span><input ${attrs}></label>`;
  const STATIONERY = ["pink", "lavender", "cream", "blue", "mint", "night"];
  const paper = (s) => (STATIONERY.includes(s) ? s : "pink");
  const GOOGLE_SVG = `<svg aria-hidden="true" viewBox="0 0 24 24" class="size-[18px]"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"></path><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"></path><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"></path><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"></path></svg>`;

  let dlg = null; // {action, target, mode, error, status, stationery, results}

  function authForm(d) {
    const mode = d.mode || "login";
    return `<form class="modal-form" data-form="auth">
${mode !== "forgot" ? `${btn({ variant: "google", cls: "h-11 w-full", attrs: 'data-act="google"', html: `${GOOGLE_SVG}Continue with Google` })}<div class="auth-divider">or a little hello by email</div>` : ""}
${mode === "signup" ? field("Your name", 'name="name" required maxlength="60" placeholder="What should your friends call you?"') : ""}
${field("Email address", `name="email" type="email" required autocomplete="email" placeholder="you@example.com" value="${esc(d.email || "")}"`)}
${mode !== "forgot" ? field("Password", `name="password" type="password" required minlength="8" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" placeholder="At least 8 characters"`) : ""}
${d.error ? `<p role="alert" class="form-error">${esc(d.error)}</p>` : ""}
${d.status ? `<p role="status" class="rounded-lg bg-mint p-4 text-sm leading-relaxed">${esc(d.status)}</p>` : ""}
${btn({ type: "submit", cls: "h-11", html: `${mode === "signup" ? "Create my little corner" : mode === "forgot" ? "Send reset link" : "Come on in"}${icon("heart")}` })}
<div class="flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground">${
      mode === "login"
        ? `${btn({ variant: "link", size: "sm", attrs: 'data-act="auth-mode" data-id="signup"', html: "Sign up" })}${btn({ variant: "ghost", size: "sm", attrs: 'data-act="auth-mode" data-id="forgot"', html: "Forgot password?" })}`
        : btn({ variant: "link", size: "sm", attrs: 'data-act="auth-mode" data-id="login"', html: "Back to sign in" })
    }</div>
</form>`;
  }

  function mainForm(d, data) {
    const friends = data.friends;
    const f = data.profile;
    const a = d.action;
    const friendSelect = `<label class="form-field"><span>For a favourite person</span><select name="friend" required><option value="">Choose a friend</option>${friends
      .map((e) => `<option value="${e.id}"${d.target === e.id ? " selected" : ""}>${esc(e.display_name)}</option>`)
      .join("")}</select>${!friends.length ? '<small class="font-normal text-muted-foreground">Accept a friend request before sharing something private.</small>' : ""}</label>`;
    const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString("en-CA");
    let body = "";
    if (a === "availability")
      body = `${field("Day", `name="date" type="date" required min="${new Date().toLocaleDateString("en-CA")}" value="${d.start || tomorrow}"`)}
<div class="form-row">${field("From", 'name="start" type="time" required value="15:00"')}${field("Until", 'name="end" type="time" required value="16:00"')}</div>
${field("Around… (optional)", 'name="location" maxlength="120" placeholder="Campus, a café, your neighbourhood"')}
<label class="flex items-center gap-2 text-xs"><input name="visible" type="checkbox" checked>Share this time with accepted friends</label>
<p class="text-xs text-muted-foreground">${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)} · One-time availability</p>`;
    if (a === "letter")
      body = `${friendSelect}
${field("A little title", 'name="title" maxlength="120" placeholder="Just thinking of you"')}
<label class="form-field"><span>Your stationery</span><div class="swatches">${STATIONERY.map((e) => btn({ variant: "ghost", cls: `swatch ${e === "pink" ? "pink-bg" : "stationery-" + e} ${d.stationery === e ? "selected" : ""}`, attrs: `title="${e}" aria-label="${e} stationery" data-act="stationery" data-id="${e}"`, html: "" })).join("")}</div></label>
<label class="form-field"><span>From the heart</span><textarea name="body" required maxlength="10000" placeholder="Dear you, …" data-preview="letter"></textarea></label>
<label class="form-field"><span>Open when… (optional)</span><select name="open_when"><option value="">Whenever you like ♡</option><option>you miss me</option><option>you need a little motivation</option><option>you’re feeling sad</option><option>it’s your birthday</option></select></label>
${field("Deliver later (optional)", 'name="delivery" type="datetime-local"')}
<div class="letter-paper stationery-${d.stationery}" id="letter-preview" hidden></div>`;
    if (a === "moment")
      body = `${field("A little photo (optional)", 'name="photo" type="file" accept="image/jpeg,image/png,image/webp"')}
<label class="form-field"><span>What’s the moment?</span><textarea name="caption" required maxlength="2000" placeholder="A tiny good thing from today…"></textarea></label>
<label class="form-field"><span>Your mood</span><select name="mood"><option>happy</option><option>cozy</option><option>tired</option><option>excited</option><option>quiet</option></select></label>
<fieldset><legend class="mb-2 text-xs font-semibold">Share with</legend>${
        friends.length
          ? friends.map((e) => `<label class="mb-2 flex items-center gap-2 text-sm"><input name="audience" value="${e.id}" type="checkbox" checked>${esc(e.display_name)}</label>`).join("") + '<p class="text-xs text-muted-foreground">Untick anyone you’d rather keep this from.</p>'
          : '<p class="text-xs text-muted-foreground">Just you for now. Add friends to share your moments.</p>'
      }</fieldset>`;
    if (a === "friends")
      body = `<label class="form-field"><span>Their username</span><span class="input-prefix"><span class="input-prefix-mark" aria-hidden="true">@</span><input name="username" placeholder="your_friend" required autocapitalize="none" autocomplete="off" spellcheck="false" aria-label="Their username, without the @"></span></label>
${btn({ type: "submit", html: `${icon("search")}Find a friend` })}
${(d.results || [])
  .map((r) => {
    const linked = data.friendships.some((e) => e.requester_id === r.id || e.recipient_id === r.id);
    return `<div class="list-row"><div class="list-row-main"><strong>${esc(r.display_name)}</strong><p>@${esc(r.username)}</p></div>${btn({ size: "sm", attrs: `data-act="friend-add" data-id="${r.id}"${linked ? " disabled" : ""}`, html: `${icon("plus")}Add` })}</div>`;
  })
  .join("")}`;
    if (a === "profile")
      body = `${field("Your name", `name="name" value="${esc(f.display_name)}" required maxlength="60"`)}
${field("Username", `name="username" value="${esc(f.username)}" required maxlength="30"`)}
<label class="form-field"><span>A little about you</span><textarea name="bio" maxlength="250">${esc(f.bio)}</textarea></label>
${field("General location (optional)", `name="location" value="${esc(f.location ?? "")}"`)}
${field("Current mood", `name="mood" value="${esc(f.mood ?? "")}" placeholder="In my cozy era"`)}
<label class="flex items-center gap-2 text-xs"><input type="checkbox" name="sharing"${db.settings.share_availability ? " checked" : ""}>Share my free time</label>
<label class="flex items-center gap-2 text-xs"><input type="checkbox" name="notifications"${db.settings.notifications_enabled ? " checked" : ""}>In-app notifications</label>
${btn({ variant: "outline", attrs: 'data-act="sign-out"', html: "Sign out" })}`;
    if (a === "invite")
      body = `${friendSelect}
${field("When shall we meet?", `name="start" type="datetime-local" required value="${esc(d.start || "")}"`)}
<label class="form-field"><span>A little time together</span><select name="duration"><option value="15">15 minutes</option><option value="20">20 minutes</option><option value="25">25 minutes</option><option value="30">30 minutes</option></select></label>
${field("Meet around…", 'name="location" placeholder="A café or somewhere familiar"')}`;
    const submitLabel = a === "letter" ? "Seal with a little love" : a === "moment" ? "Keep this moment" : a === "invite" ? "Send a little invitation" : "Save";
    return `<form class="modal-form" data-form="main">${body}${d.error ? `<p role="alert" class="form-error">${esc(d.error)}</p>` : ""}${a !== "friends" ? btn({ type: "submit", cls: "h-11", html: `${submitLabel}${icon("send")}` }) : ""}</form>`;
  }

  function dialogFrame(title, description, inner, cls = "max-h-[90dvh] overflow-y-auto sm:max-w-lg") {
    return `<div class="dlg-overlay fixed inset-0 z-50${dlgEntering ? " dlg-enter" : ""}" data-state="open" data-act="close"></div>
<div role="dialog" aria-modal="true" aria-labelledby="dlg-title" data-state="open" tabindex="-1" class="${cn(
      `dlg-panel fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 sm:rounded-lg${dlgEntering ? " dlg-enter" : ""}`,
      cls
    )}">
  <div class="flex flex-col space-y-1.5 text-center sm:text-left"><h2 id="dlg-title" class="${cn("text-lg font-semibold leading-none tracking-tight", title.cls || "")}">${esc(title.text).replace(/ ♡$/, "&nbsp;♡")}</h2><p class="text-sm text-muted-foreground">${esc(description)}</p></div>
  ${inner}
  <button type="button" data-act="close" class="dlg-close absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">${icon("x", "h-4 w-4")}<span class="sr-only">Close</span></button>
</div>`;
  }

  let dlgEntering = false;
  let lastTrigger = null; // centre of the button that opened the dialog
  let closeTimer = null;
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function renderDialog() {
    const host = document.getElementById("dialog-root");
    if (dlg && closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
      host.classList.remove("is-closing");
      host.innerHTML = "";
    }
    dlgEntering = !!dlg && !host.firstElementChild;
    if (!dlg) {
      host.innerHTML = "";
      host.dataset.key = "";
      document.body.classList.remove("modal-open");
      return;
    }
    const data = getData();
    let html;
    if (dlg.action === "read-letter") {
      const g = data?.letters.find((l) => l.id === dlg.target);
      if (!g) return closeDialog();
      html = dialogFrame(
        { text: g.title },
        "A little letter, just for you.",
        `<div class="letter-paper stationery-${paper(g.stationery)}">${esc(g.body)}</div>${g.recipient_id === "me" ? btn({ variant: "outline", attrs: `data-act="letter-save" data-id="${g.id}"`, html: `${icon("heart")}${g.saved ? "Remove from memory box" : "Keep in my memory box"}` }) : ""}`,
        ""
      );
    } else {
      const desc = dlg.action === "auth" ? "Little moments. Lasting friendships." : dlg.action === "letter" ? "Something from the heart, just for them." : "Make room for the little things.";
      const showAuth = dlg.action === "auth" || !db.user;
      html = dialogFrame({ text: TITLES[showAuth && dlg.action !== "auth" ? dlg.action : dlg.action] || TITLES.auth, cls: "font-display text-2xl" }, desc, showAuth ? authForm(dlg) : mainForm(dlg, data));
    }
    const focused = document.activeElement?.name;
    // keep whatever was typed when the dialog redraws (errors, search results)
    const kept = {};
    host.querySelectorAll("input[name],select[name],textarea[name]").forEach((el) => {
      if (el.type === "file") return;
      kept[el.name + (el.type === "checkbox" ? ":" + el.value : "")] = el.type === "checkbox" ? el.checked : el.value;
    });
    const sameForm = host.dataset.key === dlg.action + (dlg.mode || "");
    host.dataset.key = dlg.action + (dlg.mode || "");
    host.innerHTML = html;
    if (sameForm)
      host.querySelectorAll("input[name],select[name],textarea[name]").forEach((el) => {
        const k = el.name + (el.type === "checkbox" ? ":" + el.value : "");
        if (!(k in kept)) return;
        if (el.type === "checkbox") el.checked = kept[k];
        else el.value = kept[k];
      });
    document.body.classList.add("modal-open");
    const panel = host.querySelector(".dlg-panel");
    if (dlgEntering && panel && lastTrigger) {
      const r = panel.getBoundingClientRect();
      panel.style.transformOrigin = `${Math.round(lastTrigger.x - r.left)}px ${Math.round(lastTrigger.y - r.top)}px`;
    }
    lastTrigger = null;
    const again = focused && host.querySelector(`[name="${focused}"]`);
    (again || host.querySelector("input:not([type=hidden]),select,textarea,[role=dialog]"))?.focus({ preventScroll: true });
  }

  function openDialog(action, target = "", start = "") {
    dlg = { action, target, start, mode: "login", error: "", status: "", stationery: "pink", results: [] };
    renderDialog();
  }
  function closeDialog() {
    dlg = null;
    const host = document.getElementById("dialog-root");
    if (!host.firstElementChild || reduceMotion()) return renderDialog();
    document.body.classList.remove("modal-open");
    host.classList.add("is-closing");
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      closeTimer = null;
      host.classList.remove("is-closing");
      if (!dlg) renderDialog();
    }, 140);
  }

  /* a short shake when something in the dialog is wrong (e.g. wrong password) */
  function nudgeDialog() {
    const panel = document.querySelector("#dialog-root .dlg-panel");
    if (!panel || reduceMotion()) return;
    panel.classList.remove("dlg-shake");
    void panel.offsetWidth;
    panel.classList.add("dlg-shake");
  }

  /* ---------- toasts (stand-in for sonner) ---------- */
  function toast(msg) {
    let host = document.querySelector(".toaster");
    if (!host) {
      host = document.createElement("section");
      host.className = "toaster group";
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    const t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.textContent = msg;
    host.appendChild(t);
    while (host.children.length > 3) host.firstElementChild.remove();
    setTimeout(() => {
      t.classList.add("leaving");
      setTimeout(() => t.remove(), reduceMotion() ? 0 : 160);
    }, 4000);
  }

  /* ---------- actions ---------- */
  function render() {
    const data = getData();
    const page = PAGES[PAGE] || homePage;
    document.getElementById("app").innerHTML = shell(page(data), data);
    const bubbles = document.getElementById("chat-bubbles");
    if (bubbles) bubbles.scrollTop = bubbles.scrollHeight;
    if (PAGE === "chats") markChatRead();
  }

  // opening a chat (while the tab is actually visible) marks that friend's messages as read
  function markChatRead() {
    if (document.visibilityState !== "visible" || !ui.chatOpen) return;
    const now = new Date().toISOString();
    const fresh = social.messages.filter((m) => m.sender_id === ui.chatOpen && m.recipient_id === "me" && !m.read_at);
    if (!fresh.length) return;
    fresh.forEach((m) => (m.read_at = now));
    sb.from("messages").update({ read_at: now }).in("id", fresh.map((m) => m.id)).then(() => {});
    setTimeout(render); // clear the dots now rather than on the next live update
  }
  document.addEventListener("visibilitychange", () => PAGE === "chats" && markChatRead());
  const refresh = () => {
    save();
    render();
  };

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = reject;
      r.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const max = 800;
          const s = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * s);
          c.height = Math.round(img.height * s);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.82));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  async function submitMain(form) {
    const fd = new FormData(form);
    const o = (k) => String(fd.get(k) ?? "");
    const a = dlg.action;
    try {
      if (a === "friends") {
        const q = o("username").toLowerCase().trim().replace(/^@+/, "");
        if (q.length < 3) throw Error("Enter at least 3 letters of a username.");
        const pattern = q.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
        const { data: found, error } = await sb.from("profiles").select("id, username, display_name, bio").ilike("username", pattern).neq("id", myId()).limit(10);
        if (error) throw error;
        found.forEach((p) => (social.profiles[p.id] = social.profiles[p.id] || p));
        dlg.results = found.filter((p) => !(db.blocks || []).includes(p.id));
        dlg.error = dlg.results.length ? "" : "No one with that username yet. Ask your friend for theirs (it’s on their Friends page).";
        return renderDialog();
      }
      if (a === "availability") {
        const s = new Date(`${o("date")}T${o("start")}`);
        const e = new Date(`${o("date")}T${o("end")}`);
        if (e <= s || s.getTime() <= Date.now()) throw Error("Choose an upcoming period with an end after its start.");
        const { error } = await sb.from("slots").insert({ starts_at: s.toISOString(), ends_at: e.toISOString(), location: o("location").slice(0, 120), visible: fd.get("visible") === "on" });
        if (error) throw error;
        await loadSocial();
      }
      if (a === "letter") {
        if (!o("friend")) throw Error("Choose a friend first.");
        const { error } = await sb.from("letters").insert({
          recipient_id: o("friend"),
          title: (o("title") || "A little letter").slice(0, 120),
          body: o("body"),
          stationery: paper(dlg.stationery),
          open_when: o("open_when").slice(0, 120) || null,
          delivered_at: o("delivery") ? new Date(o("delivery")).toISOString() : new Date().toISOString(),
        });
        if (error) throw error;
        await loadSocial();
      }
      if (a === "moment") {
        const file = fd.get("photo");
        let image = null;
        if (file instanceof File && file.size) {
          if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) throw Error("Choose a JPG, PNG or WebP photo up to 10 MB.");
          image = await resizeImage(file);
        }
        const audience = fd.getAll("audience").map(String);
        const { error } = await sb.from("moments").insert({ caption: o("caption"), mood: o("mood"), image, audience });
        if (error) throw error;
        await loadSocial();
        closeDialog();
        render();
        return toast(audience.length ? `Shared with ${audience.length === 1 ? "1 friend" : audience.length + " friends"} ♡` : "A little moment, kept just for you ♡");
      }
      if (a === "profile") {
        const u = o("username").toLowerCase().trim();
        if (!/^[a-z0-9_]{3,30}$/.test(u)) throw Error("Use 3–30 lowercase letters, numbers or underscores for your username.");
        const { error } = await sb.from("profiles").upsert({ id: myId(), username: u, display_name: o("name").slice(0, 60) || "Friend", bio: o("bio").slice(0, 250), share_availability: fd.get("sharing") === "on" });
        if (error) throw error.code === "23505" ? Error("That username is taken. Try another one.") : error;
        Object.assign(db.profile, { display_name: o("name"), username: u, bio: o("bio"), location: o("location"), mood: o("mood") });
        db.user.name = o("name");
        db.user.username = u;
        db.settings = { share_availability: fd.get("sharing") === "on", notifications_enabled: fd.get("notifications") === "on" };
      }
      if (a === "invite") {
        if (!o("friend")) throw Error("Choose a friend first.");
        const s = new Date(o("start"));
        const e = new Date(s.getTime() + Number(o("duration")) * 6e4);
        const { error } = await sb.from("invites").insert({ recipient_id: o("friend"), starts_at: s.toISOString(), ends_at: e.toISOString(), location: o("location").slice(0, 120) });
        if (error) throw error;
        await loadSocial();
      }
      if (!save()) return;
      closeDialog();
      render();
      toast({ letter: "Your little letter is on its way 💌", invite: "Catch-up suggested ♡", availability: "Free time shared with your friends ♡" }[a] || "All saved ♡");
    } catch (err) {
      dlg.error = err?.message || "Couldn’t save that. Please try again.";
      renderDialog();
    }
  }

  const AUTH_ERRORS = {
    invalid_credentials: "That email and password don’t match. Try again?",
    user_already_exists: "There’s already a corner with that email. Try signing in instead.",
    email_exists: "There’s already a corner with that email. Try signing in instead.",
    weak_password: "That password is too easy to guess. Try a longer one.",
    over_request_rate_limit: "Too many tries just now. Wait a minute and try again.",
    signup_disabled: "New sign-ups are switched off at the moment.",
  };
  const authErrorText = (err) =>
    AUTH_ERRORS[err?.code] || (/fetch|network/i.test(err?.message || "") ? "Couldn’t reach the server. Check your internet and try again." : err?.message || "Something went wrong. Please try again.");

  async function submitAuth(form) {
    if (!dlg) return;
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");
    const mode = dlg.mode || "login";
    dlg.email = email;
    dlg.error = "";
    dlg.status = "";
    if (mode === "forgot") {
      dlg.status = "Password reset emails aren’t switched on for this project yet. Ask the site owner to reset it for you ♡";
      return renderDialog();
    }
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      let authUser;
      if (mode === "signup") {
        const name = String(fd.get("name") || "").trim() || "Friend";
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
        if (error) throw error;
        if (!data.session) {
          if (!dlg) return;
          dlg.status = "Almost there! Check your inbox to confirm your email, then sign in ♡";
          dlg.mode = "login";
          return renderDialog();
        }
        authUser = data.user;
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        authUser = data.user;
      }
      await loadEverything(authUser);
      closeDialog();
      render();
      toast(mode === "signup" ? "Welcome to your little corner ♡" : "Welcome back ♡");
    } catch (err) {
      if (!dlg) return;
      dlg.error = authErrorText(err);
      renderDialog();
      nudgeDialog();
    }
  }

  async function signOut() {
    await pushing; // let the last save finish first
    try {
      await sb.auth.signOut({ scope: "local" });
    } catch (e) {}
    db = {};
    stopLive();
    social = { friendships: [], profiles: {}, moments: [], slots: [], letters: [], messages: [], invites: [] };
    clearCache();
    closeDialog();
    render();
  }

  /* on each page load: show the cached corner straight away, then check with Supabase */
  async function boot() {
    document.body.classList.add("first-paint");
    setTimeout(() => document.body.classList.remove("first-paint"), 700);
    render();
    const { data } = await sb.auth.getSession();
    const authUser = data?.session?.user;
    if (!authUser) {
      if (db.user) {
        db = {};
        clearCache();
        render();
      }
      return;
    }
    const c = readCache();
    const sameUser = c?.uid === authUser.id && c.data?.user;
    if (!sameUser) db = {};
    try {
      if (sameUser && c.dirty) save(); // a change from the last page didn't finish sending
      else await loadCorner(authUser);
    } catch (e) {
      if (!db.user) toast("Couldn’t load your corner just now. Try refreshing.");
    }
    if (db.user) {
      try {
        await syncProfile();
        await loadSocial();
        startLive();
      } catch (e) {
        toast("Couldn’t load your friends just now. Try refreshing.");
      }
    }
    render();
  }

  function act(name, id, el) {
    const fs = social.friendships;
    switch (name) {
      case "close":
        return closeDialog();
      case "auth-mode":
        dlg.mode = id;
        dlg.error = "";
        dlg.status = "";
        return renderDialog();
      case "google":
        dlg.error = "Google sign-in isn’t switched on yet. Use a little hello by email instead.";
        return renderDialog();
      case "stationery":
        dlg.stationery = id;
        document.querySelectorAll(".swatch").forEach((s) => s.classList.toggle("selected", s.dataset.id === id));
        const p = document.getElementById("letter-preview");
        if (p) p.className = `letter-paper stationery-${id}`;
        return;
      case "sign-out":
        return signOut();
      case "friend-accept":
        return socialChange(() => sb.from("friendships").update({ status: "accepted" }).eq("id", id), "You’re friends now ♡");
      case "friend-decline":
        return socialChange(() => sb.from("friendships").update({ status: "declined" }).eq("id", id));
      case "friend-cancel":
        return socialChange(() => sb.from("friendships").delete().eq("id", id), "Request cancelled");
      case "friend-remove": {
        if (!window.confirm("Remove this friend?")) return;
        const f = fs.find((x) => otherOf(x) === id);
        return f && socialChange(() => sb.from("friendships").delete().eq("id", f.id), "Friend removed");
      }
      case "friend-block": {
        if (!window.confirm("Block this person and stop private sharing?")) return;
        db.blocks = [...(db.blocks || []), id];
        save();
        const f = fs.find((x) => otherOf(x) === id);
        return f ? socialChange(() => sb.from("friendships").delete().eq("id", f.id), "Blocked") : render();
      }
      case "friend-add": {
        const existing = fs.find((f) => otherOf(f) === id);
        if (existing?.status === "pending" && existing.recipient_id === "me")
          return socialChange(() => sb.from("friendships").update({ status: "accepted" }).eq("id", existing.id), "You’re friends now ♡");
        return socialChange(async () => {
          if (existing?.status === "declined") {
            const del = await sb.from("friendships").delete().eq("id", existing.id);
            if (del.error) return del;
          }
          return sb.from("friendships").insert({ recipient_id: fromMe(id) });
        }, "A little friendship invitation sent ♡");
      }
      case "slot-delete":
        return socialChange(() => sb.from("slots").delete().eq("id", id), "Free time removed");
      case "invite-accept":
      case "invite-decline":
        return socialChange(() => sb.from("invites").update({ status: name === "invite-accept" ? "accepted" : "declined" }).eq("id", id), name === "invite-accept" ? "See you there ♡" : "Maybe another time");
      case "week":
        ui.weekOffset = Math.max(0, ui.weekOffset + Number(id));
        ui.day = ""; // first day of the new week (today on this week)
        return render();
      case "pick-day":
        ui.day = id;
        return render();
      case "mail-tab":
        ui.mailTab = id;
        return render();
      case "letter-open": {
        const t = social.letters.find((l) => l.id === id);
        if (!t) return;
        if (t.open_when && !t.opened_at && !window.confirm(`This letter is for when ${t.open_when}. Open it now?`)) return;
        if (!t.opened_at && t.recipient_id === "me") {
          t.opened_at = new Date().toISOString(); // show it as opened straight away, then tell Supabase
          render();
          sb.from("letters").update({ opened_at: t.opened_at }).eq("id", id).then(({ error }) => error && toast("Couldn’t mark that letter as opened."));
        }
        dlg = { action: "read-letter", target: id };
        return renderDialog();
      }
      case "letter-save": {
        const t = social.letters.find((l) => l.id === id);
        if (!t) return;
        t.saved = !t.saved;
        render();
        renderDialog();
        return sb.from("letters").update({ saved: t.saved }).eq("id", id).then(({ error }) => {
          if (!error) return;
          t.saved = !t.saved;
          render();
          renderDialog();
          toast("Couldn’t update your memory box just now.");
        });
      }
      case "moment-delete":
        if (!window.confirm("Delete this moment for everyone?")) return;
        return socialChange(() => sb.from("moments").delete().eq("id", id), "Moment deleted");
      case "chat-with":
        ui.chatWith = id;
        return render();
      case "notif-read":
        const local = (db.notifications || []).find((n) => n.id === id);
        if (local) local.read_at = new Date().toISOString();
        else db.readNotifs = [...(db.readNotifs || []), id].slice(-300);
        return refresh();
    }
  }

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener) {
      e.preventDefault();
      const r = opener.getBoundingClientRect();
      lastTrigger = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      return openDialog(opener.dataset.open, opener.dataset.target || "", opener.dataset.start || "");
    }
    const a = e.target.closest("[data-act]");
    if (a && !a.disabled) {
      if (a.tagName === "BUTTON" || a.dataset.act === "close") e.preventDefault();
      act(a.dataset.act, a.dataset.id, a);
    }
  });

  function busy(form, work) {
    const b = form.querySelector('[type="submit"]');
    if (!b || !work || typeof work.then !== "function") return work;
    b.dataset.loading = "";
    b.setAttribute("aria-busy", "true");
    b.disabled = true;
    work.finally(() => {
      if (!b.isConnected) return;
      delete b.dataset.loading;
      b.removeAttribute("aria-busy");
      b.disabled = false;
    });
    return work;
  }

  document.addEventListener("submit", (e) => {
    const form = e.target;
    e.preventDefault();
    if (form.dataset.form === "auth") return busy(form, submitAuth(form));
    if (form.dataset.form === "main") return busy(form, submitMain(form));
    if (form.dataset.form === "chat") {
      const body = form.body.value.trim();
      if (!body || !db.user) return;
      const draft = { id: `tmp-${uid()}`, sender_id: "me", recipient_id: form.dataset.id, body: body.slice(0, 4000), created_at: new Date().toISOString() };
      social.messages.push(draft);
      render();
      document.querySelector(".chat-compose input")?.focus();
      sb.from("messages")
        .insert({ recipient_id: draft.recipient_id, body: draft.body })
        .select("id")
        .single()
        .then(({ data: saved, error }) => {
          if (!error) {
            draft.id = saved.id; // clock -> single tick as soon as Supabase confirms
            return redrawKeepingTyping();
          }
          social.messages = social.messages.filter((m) => m !== draft);
          redrawKeepingTyping();
          toast("That message didn’t send. Check your connection and try again.");
        });
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.matches(".chat-compose input")) e.target.form.querySelector("button[type=submit]").disabled = !e.target.value.trim();
    // the @ is already shown in front of the box, so drop any @ the person types or pastes
    if (e.target.matches(".input-prefix input") && e.target.value.includes("@")) {
      const at = e.target.selectionStart;
      const before = e.target.value.length;
      e.target.value = e.target.value.replace(/@/g, "");
      const pos = Math.max(0, at - (before - e.target.value.length));
      e.target.setSelectionRange(pos, pos);
    }
    if (e.target.dataset.preview === "letter") {
      const p = document.getElementById("letter-preview");
      p.textContent = e.target.value;
      p.hidden = !e.target.value;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dlg) closeDialog();
  });

  boot();
})();
