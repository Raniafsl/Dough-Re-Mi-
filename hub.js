// PART 3 · The hub: plan data, message rewriting, broadcasts, sales, and the
// monthly check-in.
//
// Countertop (part 1), the bell (part 2) and the server and Discord bot
// (part 4) only talk to the hub through the contract below; see CONTRACT.md.
//
//   Hub.plan()                  → suggested { reason, items: [{ id, icon, name, qty, step, when, why }], agenda }
//   Hub.finalPlan()             → null, or { at, items }
//   Hub.finalisePlan(items)     → saves Grandma's accepted plan
//   Hub.rewrite(kind, sentence) → { text, insta, discord, sms, read }  (kind: treats | special | event | poll)
//   Hub.ring({ kind, text })    → ring   (a broadcast; only polls collect votes)
//   Hub.onVote(fn)              → fn(ring) when a bell poll gets a vote
//   Hub.addSale({ amount, method, items, source }) / Hub.removeSale(id)
//   Hub.onSales(fn)             → fn({ type: "added" | "removed", ... })
//   Hub.summary()               → { goal, today, count, average, week, byMethod, items, sales, rings }
//   Hub.monthly(), Hub.setMonthly(), Hub.runMonthly(), Hub.closeMonthlyNow(),
//   Hub.markReportSeen(), Hub.addTrial(), Hub.onMonthly(fn)
//   Hub.mode() / Hub.onMode(fn) → { live, discord, channel };  Hub.onSync(fn)
//   Hub.newDay()
//
// Two modes, same calls. Served by server/server.js the hub runs LIVE: the
// server's database is the source of truth and rings go on to Discord.
// Opened any other way it runs in DEMO mode, entirely in the browser.

const Hub = (() => {
  const STATE_KEY = "countertop-v2",
    GOAL = 400, // a good day's takings fill the parfait
    todayKey = new Date().toDateString();

  // ── Plan data ─────────────────────────────────────────────────────────
  // Season, weather, campus calendar and yesterday's sales are folded into
  // one plan and one plain-English reason. Hardcoded for the demo.
  const todaysPlan = {
    reason: "It’s midterms week, and the cookies sold out by 2 PM yesterday.",
    items: [
      {
        id: "cookies",
        icon: "cookie",
        emoji: "🍁",
        name: "Maple Cookies",
        qty: 30,
        step: 6,
        when: "7:00 AM",
        why: "Sold out by 2 PM yesterday, so 6 more than usual",
      },
      {
        id: "parfaits",
        icon: "parfait",
        emoji: "🍂",
        name: "Fall Parfaits",
        qty: 12,
        step: 2,
        when: "9:30 AM",
        why: "Layer them before the lunch rush",
      },
      {
        id: "choc",
        icon: "cupcake-choc",
        emoji: "🧁",
        name: "Chocolate Cupcakes",
        qty: 18,
        step: 6,
        when: "11:00 AM",
        why: "The study crowd’s favourite this week",
      },
      {
        id: "lemon",
        icon: "cupcake-lemon",
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
        icon: "bell",
        text: "Ring the bell for Student Fridays",
      },
      {
        when: "3:00 PM",
        emoji: "🎓",
        icon: "cap",
        text: "Student Fridays: 15% off with a student card",
      },
      {
        when: "6:00 PM",
        emoji: "☕",
        icon: "tea",
        text: "Finals study hall: tea refills on Grandma",
      },
      {
        when: "8:30 PM",
        emoji: "🍪",
        icon: "cookie",
        text: "Ring the bell for any leftovers",
      },
    ],
  };

  // ── Rewriting: one sentence in, three channel-shaped messages out ────
  // Rule-based stand-in for the AI rewrite; same inputs and outputs.
  const kinds = {
    treats: {
      icon: "cookie",
      emoji: "🍪",
      label: "Treats",
      head: "Leftover treats, rescued!",
      example: "Six parfaits left, half price.",
    },
    special: {
      icon: "star",
      emoji: "⭐",
      label: "Special",
      head: "This week’s special",
      example: "Student Friday: 15% off with a student card, 3–7 PM.",
    },
    event: {
      icon: "party",
      emoji: "🎉",
      label: "Event",
      head: "You’re invited",
      example: "Finals study hall tonight, free tea refills from 6.",
    },
    poll: {
      icon: "poll",
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
        text: `${s} ${kind === "treats" ? "First come, first served at the counter 💛" : kind === "poll" ? "Vote in our story today 🗳️" : "See you at Grandma’s 💛"}\n\n#GrandmasBakeria ${tags} #CampusEats`,
      },
      discord: {
        head: `${k.emoji} ${k.head}`,
        text: s,
        actions: poll
          ? read.options.map((o, i) => `${["🅰️", "🅱️", "🅲"][i]} ${o}`)
          : kind === "poll"
            ? ["👍 Yes", "👎 No"]
            : [], // everything else is a plain announcement
      },
      sms: `Grandma’s Bakeria: ${s} ${poll ? `Reply ${read.options.map((_, i) => "ABC"[i]).join(" or ")} to vote.` : kind === "poll" ? "Reply YES or NO to vote." : kind === "event" ? "See you there!" : "First come, first served at the counter."} Reply STOP to opt out.`,
      read,
    };
  }

  // ── Broadcasts and the day's sales ───────────────────────────────────
  const clock = () =>
      new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    weekBefore = [412, 388, 455, 431, 498, 520]; // Mon–Sat history, demo mode only

  function seededDay() {
    // Two receipts from the morning rush, so the parfait isn't empty.
    return {
      day: todayKey,
      finalPlan: null,
      rings: [],
      sales: [
        {
          id: "seed-1",
          time: "8:12 AM",
          amount: 14.5,
          method: "card",
          source: "scan",
          items: [
            { name: "Maple Cookies", amount: 7.5 },
            { name: "Coffee", amount: 7 },
          ],
        },
        {
          id: "seed-2",
          time: "9:40 AM",
          amount: 19.75,
          method: "cash",
          source: "scan",
          items: [
            { name: "Fall Parfait", amount: 13 },
            { name: "Chocolate Cupcake", amount: 6.75 },
          ],
        },
      ],
    };
  }
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      if (saved?.day === todayKey && Array.isArray(saved.sales)) return saved;
    } catch {}
    return seededDay();
  }
  function save() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {}
  }
  let state = load(),
    serverWeekBefore = null;
  const voteListeners = [],
    salesListeners = [];

  // DEMO: a bell poll gets a few simulated votes.
  function simulateVotes(r, options) {
    const n = 18 + Math.floor(Math.random() * 10);
    let i = 0;
    const timer = setInterval(() => {
      (r.votes ||= []).push(
        options[
          Math.random() < 0.6
            ? 0
            : 1 + Math.floor(Math.random() * (options.length - 1))
        ],
      );
      save();
      voteListeners.forEach((fn) => fn(r));
      if (++i >= n) clearInterval(timer);
    }, 250);
  }

  // ── Live mode: the server stores everything and relays rings to Discord ──
  let mode = { live: false, discord: false, channel: null };
  const modeListeners = [];

  // In live mode the server's database is the source of truth: load today
  // from it, then keep the browser copy as a cache.
  const syncListeners = [],
    post = (url, body, method = "POST") =>
      fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body || {}),
      }).catch(() => {});
  async function syncFromServer() {
    try {
      const s = await fetch("/api/state").then((r) => r.json());
      state = {
        day: todayKey,
        finalPlan: s.finalPlan,
        rings: s.rings,
        sales: s.sales,
      };
      // Earlier days this week, from the database; today is added live.
      serverWeekBefore = s.week - s.sales.reduce((t, x) => t + x.amount, 0);
      monthly = { ...monthly, ...s.monthly };
      save();
      saveMonthly();
      syncListeners.forEach((fn) => fn());
    } catch {}
  }

  function goLive(health) {
    mode = {
      live: true,
      discord: !!health.discord,
      channel: health.channel || null,
    };
    modeListeners.forEach((fn) => fn(mode));
    syncFromServer();
    const events = new EventSource("/api/events");
    // Votes on a bell poll or on the monthly check-in.
    events.addEventListener("vote", (e) => {
      const { ringId, choice, channel } = JSON.parse(e.data),
        r = state.rings.find((x) => x.id === ringId);
      if (r) {
        (r.votes ||= []).push(choice);
        save();
        voteListeners.forEach((fn) => fn(r));
      } else if (ringId === monthly.current?.id) monthlyVote(choice, channel);
    });
    // Sales logged on another screen (for example the phone that scanned them).
    events.addEventListener("sale", (e) => {
      const sale = JSON.parse(e.data);
      if (state.sales.some((x) => x.id === sale.id)) return;
      state.sales.push(sale);
      save();
      salesListeners.forEach((fn) => fn({ type: "added", sale }));
    });
    events.addEventListener("sale-removed", (e) => {
      const { id } = JSON.parse(e.data);
      if (!state.sales.some((x) => x.id === id)) return;
      state.sales = state.sales.filter((x) => x.id !== id);
      save();
      salesListeners.forEach((fn) => fn({ type: "removed", id }));
    });
    // The server sends the monthly poll by itself on the 1st, and closes it.
    events.addEventListener("monthly-open", (e) => {
      const m = JSON.parse(e.data);
      if (monthly.current?.id === m.id) return;
      monthly.current = { ...m, votes: {}, byChannel: {}, open: true };
      saveMonthly();
      notifyMonthly({ type: "open" });
    });
    events.addEventListener("monthly-close", async () => {
      await syncFromServer();
      notifyMonthly({ type: "report", report: monthly.reports[0] });
    });
    events.addEventListener("status", (e) => {
      const h = JSON.parse(e.data);
      mode = { live: true, discord: !!h.discord, channel: h.channel || null };
      modeListeners.forEach((fn) => fn(mode));
    });
  }
  // GitHub Pages and plain files have no server, so they stay in demo mode.
  if (
    location.protocol.startsWith("http") &&
    !location.hostname.endsWith("github.io") &&
    !window.COUNTERTOP_STANDALONE
  )
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => h?.ok && goLive(h))
      .catch(() => {});

  // Ringing the bell is a broadcast: one message, out to every channel.
  function ring({ kind, text }) {
    const m = rewrite(kind, text),
      options =
        kind === "poll"
          ? m.read.options.length > 1
            ? m.read.options
            : ["Yes", "No"]
          : null,
      r = {
        id: newId(),
        kind,
        text: m.text,
        time: clock(),
        options,
        votes: options ? [] : undefined,
      };
    state.rings.push(r);
    save();
    if (mode.live)
      post("/api/rings", {
        id: r.id,
        kind,
        text: m.text,
        options,
        discord: m.discord,
      });
    else if (options) simulateVotes(r, options);
    return r;
  }

  // A sale, logged from a scanned (or typed-in) receipt.
  function addSale({ amount, method, items, source }) {
    const sale = {
      id: newId(),
      time: clock(),
      amount: Math.round(Number(amount) * 100) / 100,
      method: method || null,
      items: (items || []).slice(0, 20),
      source: source || "typed",
    };
    if (!(sale.amount > 0)) return null;
    state.sales.push(sale);
    save();
    if (mode.live) post("/api/sales", sale);
    salesListeners.forEach((fn) => fn({ type: "added", sale }));
    return sale;
  }
  function removeSale(id) {
    state.sales = state.sales.filter((x) => x.id !== id);
    save();
    if (mode.live) post("/api/sales/remove", { id });
    salesListeners.forEach((fn) => fn({ type: "removed", id }));
  }

  // ── Monthly check-in: an automatic "what should Grandma make?" poll ──
  // Goes out on the 1st of every month at 10 AM, closes after a few days,
  // and leaves Grandma a plain-English report on her counter.
  const MONTHLY_KEY = "countertop-monthly-v1",
    monthName = (d) => d.toLocaleDateString("en-CA", { month: "long" }),
    nextFirst = () => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth() + 1, 1, 10);
    };
  function seededMonthly() {
    const lastMonth = new Date();
    lastMonth.setDate(0);
    return {
      question: "What would you like to see at Grandma’s next month?",
      options: [
        "Pumpkin pie parfait",
        "Gluten-free cookies",
        "Hot cocoa bar",
        "Sunday baking class",
      ],
      closeDays: 3,
      current: null,
      trial: null,
      reports: [
        {
          month: monthName(lastMonth),
          question: "What would you like to see at Grandma’s next month?",
          results: [
            ["Apple Cider Crisp parfait", 46],
            ["Chai Pear & Ginger parfait", 31],
            ["Vegan cookies", 22],
            ["Saturday study brunch", 18],
          ],
          byChannel: { discord: 64, text: 35, instagram: 18 },
          seen: false,
        },
      ],
    };
  }
  let monthly = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MONTHLY_KEY));
      if (saved?.reports) return saved;
    } catch {}
    return seededMonthly();
  })();
  const saveMonthly = () => {
      try {
        localStorage.setItem(MONTHLY_KEY, JSON.stringify(monthly));
      } catch {}
    },
    monthlyListeners = [],
    notifyMonthly = (event) => monthlyListeners.forEach((fn) => fn(event));

  function monthlyVote(choice, channel) {
    const c = monthly.current;
    if (!c?.open || !c.options.includes(choice)) return;
    c.votes[choice] = (c.votes[choice] || 0) + 1;
    c.byChannel[channel] = (c.byChannel[channel] || 0) + 1;
    saveMonthly();
    notifyMonthly({ type: "vote" });
  }

  function closeMonthly() {
    const c = monthly.current;
    if (!c) return;
    const report = {
      month: c.month,
      question: c.question,
      results: c.options
        .map((o) => [o, c.votes[o] || 0])
        .sort((a, b) => b[1] - a[1]),
      byChannel: c.byChannel,
      seen: false,
    };
    monthly.reports.unshift(report);
    monthly.current = null;
    saveMonthly();
    notifyMonthly({ type: "report", report });
  }

  // STUB: neighbours vote over a few seconds, then the poll closes itself.
  function simulateMonthly(c) {
    const weights = c.options.map((_, i) => [0.4, 0.27, 0.19, 0.14][i] ?? 0.1),
      total = weights.reduce((a, b) => a + b, 0),
      n = 36 + Math.floor(Math.random() * 14),
      channels = ["discord", "discord", "discord", "text", "text", "instagram"];
    let i = 0;
    const timer = setInterval(() => {
      let r = Math.random() * total,
        k = 0;
      while ((r -= weights[k]) > 0 && k < weights.length - 1) k++;
      monthlyVote(
        c.options[k],
        channels[Math.floor(Math.random() * channels.length)],
      );
      if (++i >= n) {
        clearInterval(timer);
        setTimeout(closeMonthly, 900);
      }
    }, 7000 / n);
  }

  function runMonthly() {
    if (monthly.current?.open) return monthly.current;
    const now = new Date();
    monthly.current = {
      id: `monthly-${Date.now()}`,
      month: monthName(now),
      question: monthly.question,
      options: monthly.options.filter(Boolean),
      sentAt: now.toISOString(),
      closesAt: new Date(
        now.getTime() + monthly.closeDays * 86400000,
      ).toISOString(),
      votes: {},
      byChannel: {},
      open: true,
    };
    saveMonthly();
    notifyMonthly({ type: "open" });
    if (mode.live)
      fetch("/api/monthly/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: monthly.current.id,
          question: monthly.current.question,
          options: monthly.current.options,
          closeDays: monthly.closeDays,
        }),
      }).catch(() => {});
    else simulateMonthly(monthly.current);
    return monthly.current;
  }

  function trialItem() {
    const t = monthly.trial;
    if (!t || t.day !== todayKey) return null;
    return {
      id: "trial",
      emoji: "⭐",
      icon: /parfait/i.test(t.name)
        ? "parfait"
        : /cookie/i.test(t.name)
          ? "cookie"
          : "star",
      name: `${t.name} (trial)`,
      qty: 12,
      step: 6,
      when: "10:00 AM",
      why: `Top pick in the ${t.month} poll, so try a small batch`,
    };
  }

  function summary() {
    const sales = state.sales,
      today = sales.reduce((t, x) => t + x.amount, 0),
      weekday = (new Date().getDay() + 6) % 7,
      byMethod = { card: 0, cash: 0, other: 0 },
      items = {};
    for (const x of sales) {
      byMethod[
        x.method === "card" || x.method === "cash" ? x.method : "other"
      ] += x.amount;
      for (const it of x.items || []) {
        items[it.name] ??= { n: 0, cash: 0 };
        items[it.name].n++;
        items[it.name].cash += it.amount || 0;
      }
    }
    return {
      goal: GOAL,
      today,
      count: sales.length,
      average: sales.length ? today / sales.length : 0,
      week:
        (serverWeekBefore ??
          weekBefore.slice(0, weekday).reduce((t, v) => t + v, 0)) + today,
      byMethod,
      items,
      sales,
      rings: state.rings,
    };
  }

  return {
    kinds,
    plan: () => {
      const trial = trialItem();
      return trial
        ? { ...todaysPlan, items: [...todaysPlan.items, trial] }
        : todaysPlan;
    },
    finalPlan: () => state.finalPlan,
    finalisePlan(items) {
      state.finalPlan = {
        at: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        items: items.map(({ id, emoji, icon, name, qty, when }) => ({
          id,
          emoji,
          icon,
          name,
          qty,
          when,
        })),
      };
      save();
      if (mode.live) post("/api/plan", state.finalPlan, "PUT");
    },
    monthly: () => ({ ...monthly, nextRun: nextFirst() }),
    setMonthly({ question, options }) {
      if (question) monthly.question = question;
      if (options)
        monthly.options = options
          .map((o) => o.trim())
          .filter(Boolean)
          .slice(0, 4);
      saveMonthly();
      if (mode.live)
        fetch("/api/monthly/options", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            question: monthly.question,
            options: monthly.options,
            closeDays: monthly.closeDays,
          }),
        }).catch(() => {});
    },
    runMonthly,
    closeMonthlyNow() {
      if (mode.live && monthly.current)
        fetch("/api/monthly/close", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: monthly.current.id }),
        }).catch(() => {});
      else closeMonthly();
    },
    markReportSeen() {
      if (monthly.reports[0]) monthly.reports[0].seen = true;
      saveMonthly();
      if (mode.live) post("/api/monthly/seen");
    },
    addTrial(name, month) {
      monthly.trial = { name, month, day: todayKey };
      saveMonthly();
      if (mode.live) post("/api/monthly/trial", monthly.trial);
    },
    onSync: (fn) => syncListeners.push(fn),
    onMonthly: (fn) => monthlyListeners.push(fn),
    mode: () => mode,
    onMode: (fn) => modeListeners.push(fn),
    rewrite,
    ring,
    onVote: (fn) => voteListeners.push(fn),
    addSale,
    removeSale,
    onSales: (fn) => salesListeners.push(fn),
    summary,
    async newDay() {
      state = seededDay();
      save();
      if (mode.live) {
        await post("/api/day/reset");
        await syncFromServer();
      }
    },
  };
})();
