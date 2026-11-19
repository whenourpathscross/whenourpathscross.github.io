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
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";
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
  const FRIENDS = [
    { id: "sarah", display_name: "Sarah", username: "sarah", bio: "Matcha, sunsets and long walks ♡" },
    { id: "emma", display_name: "Emma", username: "emma", bio: "Always up for a slow afternoon." },
    { id: "alex", display_name: "Alex", username: "alex", bio: "" },
  ];

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  let db = load();
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      toast("Your browser is out of space for that. Try a smaller photo.");
      return false;
    }
  }

  function seedFor(user) {
    const now = Date.now();
    const H = 36e5;
    return {
      user,
      profile: { id: "me", display_name: user.name, username: user.username, bio: "", location: "", mood: "" },
      settings: { share_availability: true, notifications_enabled: true },
      since: now,
      friendships: [
        { id: "f-sarah", requester_id: "sarah", recipient_id: "me", status: "accepted" },
        { id: "f-emma", requester_id: "me", recipient_id: "emma", status: "accepted" },
        { id: "f-alex", requester_id: "alex", recipient_id: "me", status: "pending" },
      ],
      blocks: [],
      slots: [],
      letters: [
        {
          id: "l-sarah",
          sender_id: "sarah",
          recipient_id: "me",
          title: "Just thinking of you",
          body: "Just a reminder that you make my days a little brighter. ♡",
          stationery: "lavender",
          open_when: null,
          created_at: new Date(now - 3 * H).toISOString(),
          opened_at: null,
          saved: false,
        },
      ],
      moments: [
        { id: "m-sarah", user_id: "sarah", caption: "a little matcha moment 🍵", mood: "happy", image: "cafe", created_at: new Date(now - 2 * H).toISOString() },
        { id: "m-emma", user_id: "emma", caption: "stopped to smell the flowers 🌷", mood: "cozy", image: null, created_at: new Date(now - 4 * H).toISOString() },
      ],
      invites: [
        {
          id: "i-emma",
          sender_id: "emma",
          recipient_id: "me",
          starts_at: new Date(new Date().setHours(48 + 12, 30, 0, 0)).toISOString(),
          ends_at: new Date(new Date().setHours(48 + 12, 55, 0, 0)).toISOString(),
          location: "Tiong Bahru",
          status: "pending",
        },
      ],
      notifications: [
        { id: "n1", body: "Sarah left you a little letter 💌", created_at: new Date(now - 3 * H).toISOString(), read_at: null },
        { id: "n2", body: "Alex would love to be friends ♡", created_at: new Date(now - 5 * H).toISOString(), read_at: null },
        { id: "n3", body: "Emma suggested a little catch-up ☕", created_at: new Date(now - 6 * H).toISOString(), read_at: null },
      ],
      messages: [
        { id: "msg1", sender_id: "sarah", recipient_id: "me", body: "hii! free for a quick coffee this week? ☕", created_at: new Date(now - 90 * 6e4).toISOString() },
        { id: "msg2", sender_id: "emma", recipient_id: "me", body: "saw the cutest café near Tiong Bahru, we have to go 🌼", created_at: new Date(now - 30 * 6e4).toISOString() },
      ],
    };
  }

  /* friends' free time is generated fresh each visit so it never goes stale */
  function friendSlots() {
    const day = (offset, h, m) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      d.setHours(h, m, 0, 0);
      return d.toISOString();
    };
    return [
      { id: "s-sarah", user_id: "sarah", starts_at: day(1, 15, 0), ends_at: day(1, 15, 30), location: "Near campus", visible: true },
      { id: "s-emma", user_id: "emma", starts_at: day(1, 15, 15), ends_at: day(1, 15, 40), location: "Tiong Bahru", visible: true },
      { id: "s-sarah2", user_id: "sarah", starts_at: day(2, 17, 0), ends_at: day(2, 18, 0), location: "A café nearby", visible: true },
    ];
  }

  /* mirrors the shape the original provider gave every page */
  function getData() {
    if (!db.user) return null;
    const blocked = new Set(db.blocks || []);
    const accepted = db.friendships.filter((f) => f.status === "accepted");
    const friendIds = new Set(accepted.map((f) => (f.requester_id === "me" ? f.recipient_id : f.requester_id)));
    const friends = FRIENDS.filter((p) => friendIds.has(p.id) && !blocked.has(p.id));
    const fset = new Set(friends.map((f) => f.id));
    return {
      profile: db.profile,
      friends,
      allProfiles: FRIENDS,
      friendships: db.friendships.filter((f) => !blocked.has(f.requester_id) && !blocked.has(f.recipient_id)),
      slots: [...db.slots, ...friendSlots().filter((s) => fset.has(s.user_id))].map((s) => ({ ...s })),
      letters: db.letters.filter((l) => l.sender_id === "me" || fset.has(l.sender_id)),
      moments: db.moments
        .filter((m) => m.user_id === "me" || fset.has(m.user_id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      invites: db.invites.filter((i) => fset.has(i.sender_id) || fset.has(i.recipient_id)),
      notifications: db.notifications,
    };
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
    const unread = n.page === "mailbox" && data && data.letters.some((l) => !l.opened_at && l.recipient_id === "me");
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
        ${btn({ variant: "ghost", size: "icon", to: "/notifications", attrs: 'title="Notifications" aria-label="Notifications"', html: icon("bell") })}
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
    `<div class="greeting"><div><p class="eyebrow">${eyebrow}</p><h1 class="page-title">${esc(title)}</h1><p class="page-subtitle">${subtitle}</p></div>${action ?? '<span class="hand greeting-doodle">a little closer ♡</span>'}</div>`;
  const emptyState = ({ title, text, action = "" }) => `<div class="empty-state">${icon("heart")}<h3>${title}</h3><p>${text}</p>${action}</div>`;

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
                `<div class="list-row"><span class="action-icon pink-bg">${icon("camera")}</span><div><strong>${esc(m.caption)}</strong><p>${esc(m.mood)} · ${new Date(m.created_at).toLocaleDateString()}</p></div></div>`
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
      subtitle: "A small circle. A whole lot of love.",
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
            : ""
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
    const days = Array.from({ length: 7 }, (_, n) => new Date(t.getFullYear(), t.getMonth(), t.getDate() + n));
    const mine = data ? data.slots.filter((s) => s.user_id === "me") : [];
    const friendName = (id) => data?.friends.find((f) => f.id === id)?.display_name;
    return `${pageHeader({
      eyebrow: "CROSSPATHS",
      title: "A little time, together",
      subtitle: "Leave a little space for something spontaneous.",
      action: btn({ attrs: 'data-open="availability"', html: `${icon("plus")}Add free time` }),
    })}
<div class="week-strip">${days.map((d, i) => `<div class="week-day ${i === 0 ? "today" : ""}">${d.toLocaleDateString([], { weekday: "short" })}<strong>${d.getDate()}</strong></div>`).join("")}</div>
${mine.length
      ? `<div class="list-stack">${mine
          .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
          .map(
            (s) => `<div class="list-row">${icon("calendar-days", "text-primary")}<div class="list-row-main"><strong>${new Date(s.starts_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} – ${timeFmt(s.ends_at)}</strong><p>${esc(s.location || "Somewhere familiar")} · ${s.visible ? "Shared with friends" : "Only you"}</p></div>${btn({ variant: "ghost", size: "icon", attrs: `title="Delete period" data-act="slot-delete" data-id="${s.id}"`, html: icon("trash-2") })}</div>`
          )
          .join("")}</div>`
      : emptyState({ title: "What does your week look like?", text: "A spare half-hour can become your favourite part of the day.", action: btn({ attrs: 'data-open="availability"', html: `${icon("plus")}Add a little free time` }) })}
<h2 class="font-display text-xl my-7">Upcoming catch-ups &amp; invitations</h2>
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

  const ui = { mailTab: "Inbox", openLetter: null, chatWith: "" };

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
              cls: `letter-card h-auto flex-col whitespace-normal stationery-${t.stationery}`,
              attrs: `data-act="letter-open" data-id="${t.id}"`,
              html: `<div class="envelope">${icon("heart")}</div><h3>${esc(t.title)}</h3><p>${t.opened_at ? "Opened with love" : "Sealed with love"} · ${new Date(t.created_at).toLocaleDateString()}</p>${t.open_when ? `<p>Open when ${esc(t.open_when)}</p>` : ""}`,
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
        const img = t.image === "cafe" ? IMG.cafe : t.image;
        return `<article class="polaroid">${img ? `<img src="${img}" width="500" height="500" loading="lazy" alt="A private friendship moment">` : '<div class="moment-colour mint-bg">🌼</div>'}<p class="polaroid-caption">${esc(t.caption)}</p><div class="polaroid-meta"><span>${esc(t.mood)} · ${new Date(t.created_at).toLocaleDateString()}</span>${t.user_id === "me" ? btn({ variant: "ghost", size: "icon", attrs: `title="Delete moment" data-act="moment-delete" data-id="${t.id}"`, html: icon("trash-2") }) : ""}</div></article>`;
      })
      .join("")}</div>`;
  }

  function chatsPage(data) {
    const header = pageHeader({ eyebrow: "CROSSCHAT", title: "A little conversation", subtitle: "No big reason needed. Just say hi." });
    if (!data?.friends.length)
      return header + emptyState({ title: "Your people, one little hello away", text: "Add a friend to start a private conversation.", action: btn({ attrs: 'data-open="friends"', html: `${icon("user-plus")}Find a friend` }) });
    const d = data.friends.some((f) => f.id === ui.chatWith) ? ui.chatWith : data.friends[0].id;
    const f = data.friends.find((x) => x.id === d);
    const msgs = db.messages.filter((m) => (m.sender_id === "me" && m.recipient_id === d) || (m.sender_id === d && m.recipient_id === "me"));
    return `${header}<div class="chat-layout">
  <div class="chat-friends">${data.friends.map((e) => btn({ variant: e.id === d ? "secondary" : "ghost", cls: "w-full justify-start h-auto py-3", attrs: `data-act="chat-with" data-id="${e.id}"`, html: `${avatar(e.display_name)}${esc(e.display_name)}` })).join("")}</div>
  <div class="chat-main">
    <div class="chat-header">${avatar(f.display_name)}<strong class="flex-1">${esc(f.display_name)}</strong>${btn({ size: "icon", variant: "ghost", attrs: `title="Send a letter" data-open="letter" data-target="${d}"`, html: icon("mail") })}${btn({ size: "icon", variant: "ghost", attrs: `title="Suggest a catch-up" data-open="invite" data-target="${d}"`, html: icon("calendar-days") })}</div>
    <div class="chat-bubbles" id="chat-bubbles">${msgs.map((e) => `<div class="message ${e.sender_id === "me" ? "own" : ""}"><p>${esc(e.body)}</p><small>${timeFmt(e.created_at)}</small></div>`).join("")}</div>
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
  const GOOGLE_SVG = `<svg aria-hidden="true" viewBox="0 0 24 24" class="size-[18px]"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"></path><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"></path><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"></path><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"></path></svg>`;

  let dlg = null; // {action, target, mode, error, status, stationery, results}

  function authForm(d) {
    const mode = d.mode || "login";
    return `<form class="modal-form" data-form="auth">
${mode !== "forgot" ? `${btn({ variant: "google", cls: "h-11 w-full", attrs: 'data-act="google"', html: `${GOOGLE_SVG}Continue with Google` })}<div class="auth-divider">or a little hello by email</div>` : ""}
${mode === "signup" ? field("Your name", 'name="name" required maxlength="60" placeholder="What should your friends call you?"') : ""}
${field("Email address", 'name="email" type="email" required placeholder="you@example.com"')}
${mode !== "forgot" ? field("Password", `name="password" type="password" required minlength="8" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" placeholder="At least 8 characters"`) : ""}
${d.error ? `<p role="alert" class="form-error">${esc(d.error)}</p>` : ""}
${d.status ? `<p role="status" class="rounded-lg bg-mint p-4 text-sm leading-relaxed">${esc(d.status)}</p>` : ""}
${btn({ type: "submit", cls: "h-11", html: `${mode === "signup" ? "Create my little corner" : mode === "forgot" ? "Send reset link" : "Come on in"}${icon("heart")}` })}
<div class="flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground">${
      mode === "login"
        ? `New here? ${btn({ variant: "link", size: "sm", attrs: 'data-act="auth-mode" data-id="signup"', html: "Make yourself at home" })}${btn({ variant: "ghost", size: "sm", attrs: 'data-act="auth-mode" data-id="forgot"', html: "Forgot password?" })}`
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
      body = `${field("Day", `name="date" type="date" required min="${new Date().toLocaleDateString("en-CA")}" value="${tomorrow}"`)}
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
          ? friends.map((e) => `<label class="mb-2 flex items-center gap-2 text-sm"><input name="audience" value="${e.id}" type="checkbox">${esc(e.display_name)}</label>`).join("")
          : '<p class="text-xs text-muted-foreground">Just you for now. Add friends to share your moments.</p>'
      }</fieldset>`;
    if (a === "friends")
      body = `${field("Their username", 'name="username" placeholder="@your_friend" required')}
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
${field("When shall we meet?", 'name="start" type="datetime-local" required')}
<label class="form-field"><span>A little time together</span><select name="duration"><option value="15">15 minutes</option><option value="20">20 minutes</option><option value="25">25 minutes</option><option value="30">30 minutes</option></select></label>
${field("Meet around…", 'name="location" placeholder="A café or somewhere familiar"')}`;
    const submitLabel = a === "letter" ? "Seal with a little love" : a === "moment" ? "Keep this moment" : a === "invite" ? "Send a little invitation" : "Save";
    return `<form class="modal-form" data-form="main">${body}${d.error ? `<p role="alert" class="form-error">${esc(d.error)}</p>` : ""}${a !== "friends" ? btn({ type: "submit", cls: "h-11", html: `${submitLabel}${icon("send")}` }) : ""}</form>`;
  }

  function dialogFrame(title, description, inner, cls = "max-h-[90dvh] overflow-y-auto sm:max-w-lg") {
    return `<div class="fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" data-state="open" data-act="close"></div>
<div role="dialog" aria-modal="true" aria-labelledby="dlg-title" data-state="open" tabindex="-1" class="${cn(
      "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
      cls
    )}">
  <div class="flex flex-col space-y-1.5 text-center sm:text-left"><h2 id="dlg-title" class="${cn("text-lg font-semibold leading-none tracking-tight", title.cls || "")}">${esc(title.text)}</h2><p class="text-sm text-muted-foreground">${esc(description)}</p></div>
  ${inner}
  <button type="button" data-act="close" class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">${icon("x", "h-4 w-4")}<span class="sr-only">Close</span></button>
</div>`;
  }

  function renderDialog() {
    const host = document.getElementById("dialog-root");
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
        `<div class="letter-paper stationery-${g.stationery}">${esc(g.body)}</div>${g.recipient_id === "me" ? btn({ variant: "outline", attrs: `data-act="letter-save" data-id="${g.id}"`, html: `${icon("heart")}${g.saved ? "Remove from memory box" : "Keep in my memory box"}` }) : ""}`,
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
    const again = focused && host.querySelector(`[name="${focused}"]`);
    (again || host.querySelector("input:not([type=hidden]),select,textarea,[role=dialog]"))?.focus({ preventScroll: true });
  }

  function openDialog(action, target = "") {
    dlg = { action, target, mode: "login", error: "", status: "", stationery: "pink", results: [] };
    renderDialog();
  }
  function closeDialog() {
    dlg = null;
    renderDialog();
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
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  /* ---------- actions ---------- */
  function render() {
    const data = getData();
    const page = PAGES[PAGE] || homePage;
    document.getElementById("app").innerHTML = shell(page(data), data);
    const bubbles = document.getElementById("chat-bubbles");
    if (bubbles) bubbles.scrollTop = bubbles.scrollHeight;
  }
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
        const q = o("username").toLowerCase().replace(/^@/, "").trim();
        if (q.length < 3) throw Error("Enter at least 3 letters of a username.");
        dlg.results = FRIENDS.filter((p) => p.username.startsWith(q) && !(db.blocks || []).includes(p.id));
        dlg.error = dlg.results.length ? "" : "No one with that username yet. Try sarah, emma or alex.";
        return renderDialog();
      }
      if (a === "availability") {
        const s = new Date(`${o("date")}T${o("start")}`);
        const e = new Date(`${o("date")}T${o("end")}`);
        if (e <= s || s.getTime() <= Date.now()) throw Error("Choose an upcoming period with an end after its start.");
        db.slots.push({ id: uid(), user_id: "me", starts_at: s.toISOString(), ends_at: e.toISOString(), location: o("location"), visible: fd.get("visible") === "on" });
      }
      if (a === "letter") {
        if (!o("friend")) throw Error("Choose a friend first.");
        db.letters.push({
          id: uid(),
          sender_id: "me",
          recipient_id: o("friend"),
          title: o("title") || "A little letter",
          body: o("body"),
          stationery: dlg.stationery,
          open_when: o("open_when") || null,
          created_at: new Date().toISOString(),
          delivered_at: o("delivery") ? new Date(o("delivery")).toISOString() : new Date().toISOString(),
          opened_at: null,
          saved: false,
        });
      }
      if (a === "moment") {
        const file = fd.get("photo");
        let image = null;
        if (file instanceof File && file.size) {
          if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) throw Error("Choose a JPG, PNG or WebP photo up to 10 MB.");
          image = await resizeImage(file);
        }
        db.moments.push({ id: uid(), user_id: "me", caption: o("caption"), mood: o("mood"), image, audience: fd.getAll("audience").map(String), created_at: new Date().toISOString() });
      }
      if (a === "profile") {
        const u = o("username").toLowerCase().trim();
        if (!/^[a-z0-9_]{3,30}$/.test(u)) throw Error("Use 3–30 lowercase letters, numbers or underscores for your username.");
        Object.assign(db.profile, { display_name: o("name"), username: u, bio: o("bio"), location: o("location"), mood: o("mood") });
        db.user.name = o("name");
        db.settings = { share_availability: fd.get("sharing") === "on", notifications_enabled: fd.get("notifications") === "on" };
      }
      if (a === "invite") {
        if (!o("friend")) throw Error("Choose a friend first.");
        const s = new Date(o("start"));
        const e = new Date(s.getTime() + Number(o("duration")) * 6e4);
        db.invites.push({ id: uid(), sender_id: "me", recipient_id: o("friend"), starts_at: s.toISOString(), ends_at: e.toISOString(), location: o("location"), status: "pending" });
      }
      if (!save()) return;
      closeDialog();
      render();
      toast(a === "letter" ? "Your little letter is on its way 💌" : a === "moment" ? "A little moment, kept ♡" : "All saved ♡");
    } catch (err) {
      dlg.error = err?.message || "Couldn’t save that. Please try again.";
      renderDialog();
    }
  }

  function submitAuth(form) {
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const mode = dlg.mode;
    db.accounts = db.accounts || {};
    dlg.error = "";
    dlg.status = "";
    if (mode === "forgot") {
      dlg.status = "This copy keeps your corner in this browser, so there’s no password to reset. Just sign in with your email ♡";
      return renderDialog();
    }
    if (mode === "signup") {
      const name = String(fd.get("name") || "").trim() || "Friend";
      db.accounts[email] = { name };
      return signIn(email, name, "Welcome to your little corner ♡");
    }
    const acct = db.accounts[email];
    if (!acct) {
      dlg.error = "Invalid login credentials";
      return renderDialog();
    }
    signIn(email, acct.name, "Welcome to your little corner ♡");
  }

  function signIn(email, name, msg) {
    const accounts = db.accounts || {};
    const saved = (db.corners || {})[email];
    const username = (name.toLowerCase().replace(/[^a-z0-9_]/g, "") || "friend").slice(0, 30).padEnd(3, "_");
    const corner = saved || seedFor({ email, name, username });
    const corners = { ...(db.corners || {}) };
    db = { ...corner, accounts, corners };
    save();
    closeDialog();
    render();
    toast(msg);
  }

  function signOut() {
    const corners = { ...(db.corners || {}) };
    const { accounts, corners: _c, ...corner } = db;
    if (db.user) corners[db.user.email] = corner;
    db = { accounts, corners };
    save();
    closeDialog();
    render();
  }

  function act(name, id, el) {
    const fs = db.friendships;
    switch (name) {
      case "close":
        return closeDialog();
      case "auth-mode":
        dlg.mode = id;
        dlg.error = "";
        dlg.status = "";
        return renderDialog();
      case "google":
        dlg.error = "Google sign-in needs the original app’s server. Use a little hello by email instead.";
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
        fs.find((f) => f.id === id).status = "accepted";
        return refresh();
      case "friend-decline":
        fs.find((f) => f.id === id).status = "declined";
        return refresh();
      case "friend-remove": {
        if (!window.confirm("Remove this friend?")) return;
        db.friendships = fs.filter((f) => !(f.status === "accepted" && (f.requester_id === id || f.recipient_id === id)));
        return refresh();
      }
      case "friend-block":
        if (!window.confirm("Block this person and stop private sharing?")) return;
        db.blocks = [...(db.blocks || []), id];
        return refresh();
      case "friend-add": {
        const existing = fs.find((f) => (f.requester_id === id || f.recipient_id === id) && f.status === "declined");
        if (existing) existing.status = "pending";
        else fs.push({ id: uid(), requester_id: "me", recipient_id: id, status: "pending" });
        save();
        toast("A little friendship invitation sent ♡");
        render();
        return renderDialog();
      }
      case "slot-delete":
        db.slots = db.slots.filter((s) => s.id !== id);
        return refresh();
      case "invite-accept":
      case "invite-decline":
        db.invites.find((i) => i.id === id).status = name === "invite-accept" ? "accepted" : "declined";
        return refresh();
      case "mail-tab":
        ui.mailTab = id;
        return render();
      case "letter-open": {
        const t = db.letters.find((l) => l.id === id);
        if (t.open_when && !t.opened_at && !window.confirm(`This letter is for when ${t.open_when}. Open it now?`)) return;
        if (!t.opened_at && t.recipient_id === "me") {
          t.opened_at = new Date().toISOString();
          refresh();
        }
        dlg = { action: "read-letter", target: id };
        return renderDialog();
      }
      case "letter-save": {
        const t = db.letters.find((l) => l.id === id);
        t.saved = !t.saved;
        refresh();
        return renderDialog();
      }
      case "moment-delete":
        db.moments = db.moments.filter((m) => m.id !== id);
        return refresh();
      case "chat-with":
        ui.chatWith = id;
        return render();
      case "notif-read":
        db.notifications.find((n) => n.id === id).read_at = new Date().toISOString();
        return refresh();
    }
  }

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener) {
      e.preventDefault();
      return openDialog(opener.dataset.open, opener.dataset.target || "");
    }
    const a = e.target.closest("[data-act]");
    if (a && !a.disabled) {
      if (a.tagName === "BUTTON" || a.dataset.act === "close") e.preventDefault();
      act(a.dataset.act, a.dataset.id, a);
    }
  });

  document.addEventListener("submit", (e) => {
    const form = e.target;
    e.preventDefault();
    if (form.dataset.form === "auth") return submitAuth(form);
    if (form.dataset.form === "main") return submitMain(form);
    if (form.dataset.form === "chat") {
      const body = form.body.value.trim();
      if (!body || !db.user) return;
      db.messages.push({ id: uid(), sender_id: "me", recipient_id: form.dataset.id, body, created_at: new Date().toISOString() });
      refresh();
      document.querySelector(".chat-compose input")?.focus();
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.matches(".chat-compose input")) e.target.form.querySelector("button[type=submit]").disabled = !e.target.value.trim();
    if (e.target.dataset.preview === "letter") {
      const p = document.getElementById("letter-preview");
      p.textContent = e.target.value;
      p.hidden = !e.target.value;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dlg) closeDialog();
  });

  render();
})();
