// Countertop: Plan (recipe card), Ring (shop bell), Earn (cookie jar).
const $ = (id) => document.getElementById(id),
  money = (n) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(n),
  STATE_KEY = "countertop-v1",
  JAR_GOAL = 150, // a good evening fills the jar
  todayKey = new Date().toDateString();

// ── 1 · The recipe card ────────────────────────────────────────────────
// The "smart" part (season, weather, campus calendar, yesterday's sales)
// happens behind the card; Grandma only sees the result and one reason.
const todaysPlan = {
  items: [
    { emoji: "🍁", name: "Maple Cookies", qty: 30, note: "2½ dozen" },
    { emoji: "🍂", name: "Fall Parfaits", qty: 12, note: "1 dozen" },
    { emoji: "🧁", name: "Chocolate Cupcakes", qty: 18, note: "1½ dozen" },
  ],
  reason: "It’s midterms week, and the cookies sold out by 2 PM yesterday.",
};

// ── 2 · The shop bell ──────────────────────────────────────────────────
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
  const t = s.trim().replace(/\s+/g, " ");
  return t && !/[.!?]$/.test(t) ? t + "." : t;
};

// One sentence in, three channel-shaped messages out.
function rewrite(kind, sentence) {
  const k = kinds[kind],
    s = tidy(sentence || k.example),
    read = readSentence(s),
    poll = kind === "poll" && read.options.length > 1;
  const tags = {
    treats: "#LeftoverLove",
    special: "#StudentDeals",
    event: "#StudyHall",
    poll: "#FallParfait",
  }[kind];
  return {
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

// ── State ──────────────────────────────────────────────────────────────
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

function seededDay() {
  // A lunchtime ring already brought a few coins in, so the jar isn't empty.
  return {
    day: todayKey,
    planned: false,
    rings: [
      {
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
// Earlier days this week, in dollars from claims (demo history).
const weekBefore = [64, 88, 71, 96, 83, 58];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY));
    if (saved?.day === todayKey) return saved;
  } catch {}
  return seededDay();
}
function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {}
}
let state = loadState();

const allClaims = () => state.rings.flatMap((r) => r.claims);
const tonight = () => allClaims().reduce((s, c) => s + c.amount, 0);
const weekdayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
const thisWeek = () =>
  weekBefore.slice(0, weekdayIndex).reduce((s, v) => s + v, 0) + tonight();

// ── Rendering ──────────────────────────────────────────────────────────
function renderHeader() {
  $("todayDate").textContent = new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const h = new Date().getHours();
  $("hello").textContent =
    `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"}, Grandma.`;
}

function renderRecipe() {
  $("planList").innerHTML = todaysPlan.items
    .map(
      (i) =>
        `<li><span class="qty">${i.qty}</span><span>${i.emoji} ${i.name}<small>${i.note}</small></span></li>`,
    )
    .join("");
  $("planReason").textContent = todaysPlan.reason;
  $("planStamp").hidden = !state.planned;
  $("recipeNote").textContent = state.planned
    ? todaysPlan.items
        .map((i) => `${i.qty} ${i.name.split(" ").pop().toLowerCase()}`)
        .join(" · ")
    : "Tap to see what to make";
  $("soundsGood").textContent = state.planned ? "Planned ✓" : "Sounds good 👍";
}

function flipRecipe(open, focus = true) {
  $("recipe").classList.toggle("flipped", open);
  $("recipeFront").setAttribute("aria-hidden", String(open));
  $("recipeBack").setAttribute("aria-hidden", String(!open));
  $("recipeFront").tabIndex = open ? -1 : 0;
  $("recipeBack")
    .querySelectorAll("button")
    .forEach((b) => (b.tabIndex = open ? 0 : -1));
  if (focus)
    (open ? $("soundsGood") : $("recipeFront")).focus({ preventScroll: true });
}

// Coins settle in a pile from the bottom of the jar; cookies sit among them.
const coinSpot = (i) => {
  const row = Math.floor(i / 6),
    col = i % 6;
  return { x: 52 + col * 19 + (row % 2) * 9, y: 190 - row * 9 };
};
function renderJar(newCoins = 0) {
  const g = $("jarCoins"),
    total = tonight(),
    coins = Math.min(84, Math.round((total / JAR_GOAL) * 84));
  let s = "";
  for (let i = 0; i < coins; i++) {
    const { x, y } = coinSpot(i),
      cookie = i % 7 === 3,
      fresh = i >= coins - newCoins;
    s += cookie
      ? `<g class="${fresh ? "drop" : ""}" style="--y:${y}px"><circle cx="${x}" cy="${y}" r="9" fill="#c48a4a" stroke="#8a5a2b" stroke-width="1.5"/><circle cx="${x - 3}" cy="${y - 2}" r="1.6" fill="#4f2a12"/><circle cx="${x + 3}" cy="${y + 2}" r="1.6" fill="#4f2a12"/></g>`
      : `<g class="${fresh ? "drop" : ""}" style="--y:${y}px"><ellipse cx="${x}" cy="${y}" rx="9" ry="5" fill="#e3b04b" stroke="#9c6f1e" stroke-width="1.5"/></g>`;
  }
  g.innerHTML = s;
  $("jarTonight").textContent = `${money(total)} tonight`;
  const claims = allClaims().length;
  $("jarNote").textContent =
    `${claims} claim${claims === 1 ? "" : "s"} · ${Math.min(100, Math.round((total / JAR_GOAL) * 100))}% full`;
}

function renderJarDialog() {
  const claims = allClaims(),
    rescued = claims.filter((c) => c.rescued).length,
    pollVotes = state.rings
      .filter((r) => r.kind === "poll")
      .reduce((s, r) => s + (r.votes?.length || 0), 0),
    seats = state.rings
      .filter((r) => r.kind === "event")
      .reduce((s, r) => s + r.claims.length, 0);
  $("totals").innerHTML = `
    <div class="tile hot"><span>Tonight</span><b>${money(tonight())}</b><small>${claims.length} claims</small></div>
    <div class="tile"><span>This week</span><b>${money(thisWeek())}</b><small>from claims after a ring</small></div>
    <div class="tile"><span>Saved from the bin</span><b>${rescued}</b><small>treats that would have been thrown out</small></div>
    <div class="tile"><span>Seats & votes</span><b>${seats + pollVotes}</b><small>${seats} seats saved · ${pollVotes} votes</small></div>`;
  const byChannel = { discord: 0, text: 0, instagram: 0 };
  for (const c of claims) byChannel[c.channel]++;
  const max = Math.max(1, ...Object.values(byChannel)),
    names = { discord: "Discord", text: "Text", instagram: "Instagram" };
  $("channelBars").innerHTML = Object.entries(byChannel)
    .map(
      ([k, n]) =>
        `<div class="cbar"><span>${names[k]}</span><i style="width:${(n / max) * 100}%"></i><b>${n}</b></div>`,
    )
    .join("");
  const sold = {};
  for (const c of claims.filter((c) => c.amount > 0)) {
    sold[c.item] ??= { n: 0, cash: 0 };
    sold[c.item].n++;
    sold[c.item].cash += c.amount;
  }
  $("soldList").innerHTML =
    Object.entries(sold)
      .sort((a, b) => b[1].cash - a[1].cash)
      .map(
        ([item, v]) =>
          `<li><span>${v.n} × ${item}</span><b>${money(v.cash)}</b></li>`,
      )
      .join("") || "<li><span>Nothing sold from a ring yet.</span></li>";
  const list = $("ringList");
  list.replaceChildren();
  for (const r of [...state.rings].reverse()) {
    const li = document.createElement("li"),
      result =
        r.kind === "poll"
          ? Object.entries(
              (r.votes || []).reduce(
                (m, v) => ((m[v] = (m[v] || 0) + 1), m),
                {},
              ),
            )
              .map(([o, n]) => `${o}: ${n}`)
              .join(" · ") || "votes coming in"
          : r.kind === "event"
            ? `${r.claims.length} seats saved`
            : `${r.claims.length} claimed · ${money(r.claims.reduce((s, c) => s + c.amount, 0))}`;
    li.innerHTML = `<span class="ring-kind"></span><span class="ring-text"><q></q><small></small></span>`;
    li.querySelector(".ring-kind").textContent =
      `${kinds[r.kind].emoji} ${r.time}`;
    li.querySelector("q").textContent = r.text;
    li.querySelector("small").textContent = result;
    list.append(li);
  }
}

// ── The bell sheet ─────────────────────────────────────────────────────
let kind = "treats";
function renderKinds() {
  $("kinds").innerHTML = Object.entries(kinds)
    .map(
      ([k, v]) =>
        `<button type="button" role="radio" aria-checked="${k === kind}" class="kind${k === kind ? " on" : ""}" data-kind="${k}"><span aria-hidden="true">${v.emoji}</span>${v.label}</button>`,
    )
    .join("");
  $("saySentence").placeholder = kinds[kind].example;
}
function renderPreviews() {
  const m = rewrite(kind, $("saySentence").value);
  $("instaEmoji").textContent = m.insta.emoji;
  $("instaHead").textContent = m.insta.head;
  $("instaText").textContent = m.insta.text;
  $("discordHead").textContent = m.discord.head;
  $("discordText").textContent = m.discord.text;
  $("discordActions").replaceChildren(
    ...m.discord.actions.map((a) => {
      const b = document.createElement("span");
      b.textContent = a;
      return b;
    }),
  );
  $("smsText").textContent = m.sms;
  $("smsCount").textContent = `${m.sms.length} / 160 characters`;
}

// A small brass "ding", made in the browser.
function ding() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(),
      now = ctx.currentTime;
    for (const [f, v] of [
      [1318, 0.32],
      [2637, 0.12],
      [3951, 0.05],
    ]) {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(v, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      o.connect(g).connect(ctx.destination);
      o.start(now);
      o.stop(now + 1.7);
    }
  } catch {}
}

function wobble(el) {
  el.classList.remove("wobble");
  void el.getBoundingClientRect();
  el.classList.add("wobble");
}

function toast(text) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  $("toasts").append(t);
  setTimeout(() => t.remove(), 3600);
  while ($("toasts").children.length > 3) $("toasts").firstChild.remove();
}

// Students answer the ring over the next few seconds (simulated).
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
    reduce = matchMedia("(prefers-reduced-motion: reduce)").matches,
    gap = reduce ? 60 : 5200 / n;
  let i = 0;
  const timer = setInterval(() => {
    const name = students[(i * 5 + state.rings.length * 3) % students.length],
      channel = channels[Math.floor(Math.random() * channels.length)];
    if (ring.kind === "poll") {
      const opts = read.options.length > 1 ? read.options : ["Yes", "No"],
        pick =
          opts[
            Math.random() < 0.58
              ? 0
              : 1 + Math.floor(Math.random() * (opts.length - 1))
          ];
      (ring.votes ||= []).push(pick);
      if (i < 3)
        toast(
          `🗳️ ${name} voted “${pick}” on ${channel === "text" ? "text" : channel[0].toUpperCase() + channel.slice(1)}`,
        );
    } else {
      const amount =
        ring.kind === "event"
          ? 0
          : ring.kind === "special"
            ? 7.56 * 0.85
            : read.each;
      ring.claims.push({
        name,
        channel,
        amount: Math.round(amount * 100) / 100,
        item: ring.kind === "special" ? "Student Friday order" : read.item,
        rescued: ring.kind === "treats",
      });
      if (i < 4)
        toast(
          `${ring.kind === "event" ? "✅" : "🪙"} ${name} ${ring.kind === "event" ? "saved a seat" : "claimed"} on ${channel === "text" ? "text" : channel[0].toUpperCase() + channel.slice(1)}`,
        );
      if (amount > 0) {
        renderJar(1);
        wobble($("jarCard"));
      }
    }
    saveState();
    if ($("jarDialog").open) renderJarDialog();
    if (++i >= n) {
      clearInterval(timer);
      toast(
        ring.kind === "poll"
          ? `🗳️ ${n} votes in. Tap the jar to see the result.`
          : ring.kind === "event"
            ? `✅ ${n} seats saved for tonight.`
            : `🍪 ${ring.claims.length} claimed, ${money(ring.claims.reduce((s, c) => s + c.amount, 0))} in the jar.`,
      );
      renderJar();
    }
  }, gap);
}

function ringTheBell() {
  const m = rewrite(kind, $("saySentence").value),
    text = tidy($("saySentence").value || kinds[kind].example),
    ring = {
      kind,
      text,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      claims: [],
    };
  state.rings.push(ring);
  saveState();
  ding();
  wobble($("bellIcon"));
  wobble($("bellCard"));
  $("ringStatus").textContent =
    "Ding! Sent to Instagram, #campus-eats on Discord and 214 text subscribers.";
  $("ringBtn").disabled = true;
  setTimeout(() => {
    $("bellDialog").close();
    $("ringBtn").disabled = false;
    $("ringStatus").textContent = "";
    $("saySentence").value = "";
    renderPreviews();
  }, 1400);
  simulateReplies(ring, m.read);
}

// ── Wiring ─────────────────────────────────────────────────────────────
$("recipeFront").addEventListener("click", () => flipRecipe(true));
$("flipBack").addEventListener("click", () => flipRecipe(false));
$("soundsGood").addEventListener("click", () => {
  state.planned = true;
  saveState();
  renderRecipe();
  toast("📜 Today’s plan is set. Happy baking!");
  setTimeout(() => flipRecipe(false), 700);
});

$("bellCard").addEventListener("click", () => {
  wobble($("bellIcon"));
  renderKinds();
  renderPreviews();
  $("bellDialog").showModal();
  $("saySentence").focus();
});
$("kinds").addEventListener("click", (e) => {
  const b = e.target.closest("[data-kind]");
  if (!b) return;
  kind = b.dataset.kind;
  renderKinds();
  renderPreviews();
  $("saySentence").focus();
});
$("saySentence").addEventListener("input", renderPreviews);
$("saySentence").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    ringTheBell();
  }
});
$("ringBtn").addEventListener("click", ringTheBell);

// Speaking works where the browser supports it; typing always works.
const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Speech) {
  $("micBtn").hidden = false;
  $("micBtn").addEventListener("click", () => {
    const rec = new Speech();
    rec.lang = "en-CA";
    rec.onresult = (e) => {
      $("saySentence").value = e.results[0][0].transcript;
      renderPreviews();
    };
    rec.onend = () => $("micBtn").classList.remove("listening");
    $("micBtn").classList.add("listening");
    rec.start();
  });
}

$("jarCard").addEventListener("click", () => {
  renderJarDialog();
  $("jarDialog").showModal();
});
$("newDay").addEventListener("click", () => {
  state = seededDay();
  saveState();
  renderRecipe();
  renderJar();
  renderJarDialog();
});

// Close a sheet by tapping outside it.
for (const d of [$("bellDialog"), $("jarDialog")])
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close();
  });

renderHeader();
renderRecipe();
renderJar();
flipRecipe(false, false);
