// PART 3 · The hub: plan data, message rewriting, rings and claims.
//
// Countertop (part 1), the bell (part 2) and the Discord bot (part 4) only
// talk to the hub through the contract below; see CONTRACT.md.
//
//   Hub.plan()                  → suggested { reason, items: [{ id, emoji, name, qty, step, when, why }], agenda }
//   Hub.finalPlan()             → null, or { at, items: [{ id, emoji, name, qty, when }] }
//   Hub.finalisePlan(items)     → saves Grandma's accepted plan
//   Hub.mode()                  → { live, discord, channel }; Hub.onMode(fn) when it changes
//   Hub.rewrite(kind, sentence) → { insta, discord, sms, read }  (kind: treats | special | event | poll)
//   Hub.ring({ kind, text })    → ring   (sends everywhere; claims arrive later)
//   Hub.onClaim(fn)             → fn(claim, ring) for every claim from any channel
//   Hub.onRingDone(fn)          → fn(ring) when a ring's replies have settled
//   Hub.summary()               → { tonight, week, claims, rescued, seats, votes, byChannel, sold, rings, goal }
//   Hub.newDay()
//
// Two modes, same calls. Served by server/server.js the hub runs LIVE: rings
// go to the server (and on to Discord) and real claims stream back. Opened
// any other way it runs as a STUB and simulates student replies.

const Hub = (() => {
  const STATE_KEY = "countertop-v1",
    GOAL = 150, // dollars that fill the parfait on a good evening
    todayKey = new Date().toDateString();

  // ── Plan data ─────────────────────────────────────────────────────────
  // Season, weather, campus calendar and yesterday's sales are folded into
  // one plan and one plain-English reason. Hardcoded for the demo.
  const todaysPlan = {
    reason: "It’s midterms week, and the cookies sold out by 2 PM yesterday.",
    items: [
      {
        id: "cookies",
        emoji: "🍁",
        name: "Maple Cookies",
        qty: 30,
        step: 6,
        when: "7:00 AM",
        why: "Sold out by 2 PM yesterday, so 6 more than usual",
      },
      {
        id: "parfaits",
        emoji: "🍂",
        name: "Fall Parfaits",
        qty: 12,
        step: 2,
        when: "9:30 AM",
        why: "Layer them before the lunch rush",
      },
      {
        id: "choc",
        emoji: "🧁",
        name: "Chocolate Cupcakes",
        qty: 18,
        step: 6,
        when: "11:00 AM",
        why: "The study crowd’s favourite this week",
      },
      {
        id: "lemon",
        emoji: "🍋",
        name: "Lemon Cupcakes",
        qty: 6,
        step: 6,
        when: "1:00 PM",
        why: "Only 3 sold yesterday, so a small batch",
      },
    ],
    agenda: [
      {
        when: "2:30 PM",
        emoji: "🔔",
        text: "Ring the bell for Student Fridays",
      },
      {
        when: "3:00 PM",
        emoji: "🎓",
        text: "Student Fridays: 15% off with a student card",
      },
      {
        when: "6:00 PM",
        emoji: "☕",
        text: "Finals study hall: tea refills on Grandma",
      },
      { when: "8:30 PM", emoji: "🍪", text: "Ring the bell for any leftovers" },
    ],
  };

  // ── Rewriting: one sentence in, three channel-shaped messages out ────
  // Rule-based stand-in for the AI rewrite; same inputs and outputs.
  const kinds = {
    treats: {
      emoji: "🍪",
      label: "Treats",
      head: "Leftover treats, rescued!",
      example: "Six parfaits left, half price.",
    },
    special: {
      emoji: "⭐",
      label: "Special",
      head: "This week’s special",
      example: "Student Friday: 15% off with a student card, 3–7 PM.",
    },
    event: {
      emoji: "🎉",
      label: "Event",
      head: "You’re invited",
      example: "Finals study hall tonight, free tea refills from 6.",
    },
    poll: {
      emoji: "🗳️",
      label: "Poll",
      head: "Help Grandma choose",
      example: "Which flavour next: maple pumpkin or apple cider?",
    },
  };
  const numberWords = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    dozen: 12,
  };
  const prices = [
    [/parfait/i, 6.5, "Fall Parfait"],
    [/cookie/i, 2.5, "Maple Cookie"],
    [/cupcake/i, 3.5, "Cupcake"],
    [/scone/i, 3, "Scone"],
    [/muffin/i, 3, "Muffin"],
    [/croissant/i, 3.25, "Croissant"],
  ];

  // Read the sentence the way a person would: how many, what, and at what price.
  function readSentence(text) {
    const t = text.toLowerCase(),
      numMatch = t.match(
        /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen)\b/,
      ),
      count = numMatch ? Number(numMatch[1]) || numberWords[numMatch[1]] : null,
      [, full, item] = prices.find(([re]) => re.test(t)) || [null, 4, "Treat"];
    let each = full;
    const bundle = t.match(/(\d+)\s*for\s*\$\s*(\d+(?:\.\d+)?)/),
      pct = t.match(/(\d+)\s*%/);
    if (bundle) each = Number(bundle[2]) / Number(bundle[1]);
    else if (/half/.test(t)) each = full / 2;
    else if (pct) each = full * (1 - Number(pct[1]) / 100);
    else if (/\bfree\b/.test(t) && !/refill/.test(t)) each = 0;
    const options = t.includes(" or ")
      ? text
          .split(/:|\?/)
          .filter(Boolean)
          .pop()
          .split(/\s+or\s+/i)
          .map((s) => s.replace(/[?.!]/g, "").trim())
          .filter(Boolean)
          .slice(0, 3)
      : [];
    return { count, item, each, options };
  }

  const tidy = (s) => {
    const t = s.trim().replace(/\s+/g, " "),
      cap = t.charAt(0).toUpperCase() + t.slice(1);
    return cap && !/[.!?]$/.test(cap) ? cap + "." : cap;
  };

  function rewrite(kind, sentence) {
    const k = kinds[kind],
      s = tidy(sentence || k.example),
      read = readSentence(s),
      poll = kind === "poll" && read.options.length > 1,
      tags = {
        treats: "#LeftoverLove",
        special: "#StudentDeals",
        event: "#StudyHall",
        poll: "#FallParfait",
      }[kind];
    return {
      text: s,
      insta: {
        emoji: k.emoji,
        head: k.head,
        text: `${s} ${kind === "treats" ? "First come, first served, so tap the link in bio to claim yours 💛" : kind === "poll" ? "Vote in our story today 🗳️" : "See you at Grandma’s 💛"}\n\n#GrandmasBakeria ${tags} #CampusEats`,
      },
      discord: {
        head: `${k.emoji} ${k.head}`,
        text: s,
        actions: poll
          ? read.options.map((o, i) => `${["🅰️", "🅱️", "🅲"][i]} ${o}`)
          : kind === "event"
            ? ["✅ I’m coming"]
            : ["🍪 Claim one"],
      },
      sms: `Grandma’s Bakeria: ${s} ${poll ? `Reply ${read.options.map((_, i) => "ABC"[i]).join(" or ")} to vote.` : kind === "event" ? "Reply YES to save a seat." : "Reply CLAIM to save one."} Reply STOP to opt out.`,
      read,
    };
  }

  // ── Rings and claims ─────────────────────────────────────────────────
  const students = [
    "Maya",
    "Jonah",
    "Priya",
    "Theo",
    "Aisha",
    "Sam",
    "Lucas",
    "Noor",
    "Ivy",
    "Dev",
    "Rosa",
    "Kai",
    "Leah",
    "Omar",
    "Chen",
    "Bea",
    "Felix",
    "Hana",
  ];
  const weekBefore = [64, 88, 71, 96, 83, 58]; // earlier days this week, demo history

  function seededDay() {
    // A lunchtime ring already poured a few layers, so the glass isn't empty.
    return {
      day: todayKey,
      finalPlan: null,
      rings: [
        {
          id: "lunch",
          kind: "treats",
          text: "Eight maple cookies left from lunch, 2 for $4.",
          time: "11:40 AM",
          claims: [
            "Maya",
            "Jonah",
            "Priya",
            "Theo",
            "Aisha",
            "Sam",
            "Lucas",
            "Noor",
          ].map((name, i) => ({
            name,
            channel: [
              "discord",
              "text",
              "discord",
              "instagram",
              "text",
              "discord",
              "discord",
              "text",
            ][i],
            amount: 2,
            item: "Maple Cookie",
            rescued: true,
          })),
        },
      ],
    };
  }
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      if (saved?.day === todayKey) return saved;
    } catch {}
    return seededDay();
  }
  function save() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {}
  }
  let state = load();
  const claimListeners = [],
    doneListeners = [];

  function addClaim(ring, claim) {
    if (ring.kind === "poll") (ring.votes ||= []).push(claim.choice);
    else ring.claims.push(claim);
    save();
    claimListeners.forEach((fn) => fn(claim, ring));
  }

  // STUB: students reply over the next few seconds. Live mode replaces this
  // with claims posted by the Discord bot and the text-message gateway.
  function simulateReplies(ring, read) {
    const n =
        ring.kind === "treats"
          ? Math.max(
              1,
              Math.round((read.count || 6) * (0.75 + Math.random() * 0.25)),
            )
          : ring.kind === "special"
            ? 10 + Math.floor(Math.random() * 7)
            : ring.kind === "event"
              ? 12 + Math.floor(Math.random() * 9)
              : 24 + Math.floor(Math.random() * 14),
      channels = ["discord", "discord", "discord", "text", "text", "instagram"],
      gap = matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 60
        : 5200 / n;
    let i = 0;
    const timer = setInterval(() => {
      const name = students[(i * 5 + state.rings.length * 3) % students.length],
        channel = channels[Math.floor(Math.random() * channels.length)],
        opts = read.options.length > 1 ? read.options : ["Yes", "No"],
        amount =
          ring.kind === "treats"
            ? read.each
            : ring.kind === "special"
              ? 7.56 * 0.85
              : 0;
      addClaim(ring, {
        name,
        channel,
        choice:
          ring.kind === "poll"
            ? opts[
                Math.random() < 0.58
                  ? 0
                  : 1 + Math.floor(Math.random() * (opts.length - 1))
              ]
            : undefined,
        amount: Math.round(amount * 100) / 100,
        item: ring.kind === "special" ? "Student Friday order" : read.item,
        rescued: ring.kind === "treats",
      });
      if (++i >= n) {
        clearInterval(timer);
        doneListeners.forEach((fn) => fn(ring));
      }
    }, gap);
  }

  // ── Live mode: the server relays rings to Discord and claims back ─────
  let mode = { live: false, discord: false, channel: null };
  const modeListeners = [];

  function goLive(health) {
    mode = {
      live: true,
      discord: !!health.discord,
      channel: health.channel || null,
    };
    modeListeners.forEach((fn) => fn(mode));
    const events = new EventSource("/api/events");
    events.addEventListener("claim", (e) => {
      const { ringId, claim } = JSON.parse(e.data),
        r = state.rings.find((x) => x.id === ringId);
      if (r) addClaim(r, claim);
    });
    events.addEventListener("soldout", (e) => {
      const r = state.rings.find((x) => x.id === JSON.parse(e.data).ringId);
      if (r) doneListeners.forEach((fn) => fn(r));
    });
    events.addEventListener("status", (e) => {
      const h = JSON.parse(e.data);
      mode = { live: true, discord: !!h.discord, channel: h.channel || null };
      modeListeners.forEach((fn) => fn(mode));
    });
  }
  if (location.protocol.startsWith("http"))
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => h?.ok && goLive(h))
      .catch(() => {});

  function ring({ kind, text }) {
    const m = rewrite(kind, text),
      r = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind,
        text: m.text,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        claims: [],
      };
    state.rings.push(r);
    save();
    if (mode.live)
      fetch("/api/rings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: r.id,
          kind,
          text: m.text,
          limit: kind === "treats" ? m.read.count || null : null,
          amount:
            kind === "treats"
              ? Math.round(m.read.each * 100) / 100
              : kind === "special"
                ? 6.43
                : 0,
          item: kind === "special" ? "Student Friday order" : m.read.item,
          options:
            kind === "poll" && m.read.options.length > 1
              ? m.read.options
              : null,
          discord: m.discord,
        }),
      }).catch(() => {});
    else simulateReplies(r, m.read);
    return r;
  }

  function summary() {
    const claims = state.rings.flatMap((r) => r.claims),
      tonight = claims.reduce((s, c) => s + c.amount, 0),
      weekday = (new Date().getDay() + 6) % 7,
      byChannel = { discord: 0, text: 0, instagram: 0 },
      sold = {};
    for (const c of claims) {
      byChannel[c.channel]++;
      if (c.amount > 0) {
        sold[c.item] ??= { n: 0, cash: 0 };
        sold[c.item].n++;
        sold[c.item].cash += c.amount;
      }
    }
    return {
      goal: GOAL,
      tonight,
      week: weekBefore.slice(0, weekday).reduce((s, v) => s + v, 0) + tonight,
      claims: claims.length,
      rescued: claims.filter((c) => c.rescued).length,
      seats: state.rings
        .filter((r) => r.kind === "event")
        .reduce((s, r) => s + r.claims.length, 0),
      votes: state.rings.reduce((s, r) => s + (r.votes?.length || 0), 0),
      byChannel,
      sold,
      rings: state.rings,
    };
  }

  return {
    kinds,
    plan: () => todaysPlan,
    finalPlan: () => state.finalPlan,
    finalisePlan(items) {
      state.finalPlan = {
        at: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        items: items.map(({ id, emoji, name, qty, when }) => ({
          id,
          emoji,
          name,
          qty,
          when,
        })),
      };
      save();
    },
    mode: () => mode,
    onMode: (fn) => modeListeners.push(fn),
    rewrite,
    ring,
    onClaim: (fn) => claimListeners.push(fn),
    onRingDone: (fn) => doneListeners.push(fn),
    summary,
    newDay() {
      state = seededDay();
      save();
    },
  };
})();
