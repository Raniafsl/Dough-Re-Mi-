// PART 3 · The hub server. Serves the Countertop, stores the bakery's data in
// SQLite (store.js), hands rings to the Discord bot, streams sales and votes back
// to the page, and runs the monthly check-in on its own.
//
//   npm start            (from server/, reads server/.env if present)
//
// See CONTRACT.md for the endpoints.

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { startBot } from "./bot.js";
import * as store from "./store.js";

const ROOT = path.resolve(import.meta.dirname, ".."),
  PORT = Number(process.env.PORT) || 3000,
  KINDS = new Set(["treats", "special", "event", "poll"]),
  CHANNELS = new Set(["discord", "text", "instagram"]),
  DAY_MS = 86_400_000,
  TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".md": "text/markdown; charset=utf-8",
  };

const listeners = new Set();
function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of listeners) res.write(msg);
}

const clock = (d = new Date()) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  monthName = (d = new Date()) =>
    d.toLocaleDateString("en-CA", { month: "long" }),
  monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

// ── Demo starting point ─────────────────────────────────────────────────
// Each new day starts with the lunchtime ring, and there's always last
// month's report, so the Countertop never opens empty.
const MONTHLY_DEFAULTS = {
  question: "What would you like to see at Grandma’s next month?",
  options: [
    "Pumpkin pie parfait",
    "Gluten-free cookies",
    "Hot cocoa bar",
    "Sunday baking class",
  ],
  closeDays: 3,
  lastSentMonth: null,
};
// A new day starts with two receipts from the morning rush.
function seedToday() {
  if (store.getSetting(`seeded:${store.today()}`, false)) return;
  store.setSetting(`seeded:${store.today()}`, true);
  if (store.salesCount()) return;
  store.addSale({
    id: `seed-1-${store.today()}`,
    time: "8:12 AM",
    amount: 14.5,
    method: "card",
    source: "scan",
    items: [
      { name: "Maple Cookies", amount: 7.5 },
      { name: "Coffee", amount: 7 },
    ],
  });
  store.addSale({
    id: `seed-2-${store.today()}`,
    time: "9:40 AM",
    amount: 19.75,
    method: "cash",
    source: "scan",
    items: [
      { name: "Fall Parfait", amount: 13 },
      { name: "Chocolate Cupcake", amount: 6.75 },
    ],
  });
}
if (!store.reportCount()) {
  const last = new Date();
  last.setDate(0);
  store.addReport({
    month: monthName(last),
    question: MONTHLY_DEFAULTS.question,
    results: [
      ["Apple Cider Crisp parfait", 46],
      ["Chai Pear & Ginger parfait", 31],
      ["Vegan cookies", 22],
      ["Saturday study brunch", 18],
    ],
    byChannel: { discord: 64, text: 35, instagram: 18 },
  });
}
const monthlySettings = () => ({
  ...MONTHLY_DEFAULTS,
  ...store.getSetting("monthly", {}),
});

// ── Votes (one place decides whether a vote counts) ──────────────────────
export function vote({ ringId, name, userId, channel, choice }) {
  if (!CHANNELS.has(channel)) return { ok: false, reason: "channel" };
  const safeName = String(name || "A neighbour").slice(0, 40),
    result = store.addVote(ringId, {
      who: userId || `${channel}:${safeName}`,
      name: safeName,
      channel,
      choice,
    }),
    ring = store.getRing(ringId);
  if (result.ok) broadcast("vote", { ringId, choice, channel });
  return { ...result, ring };
}

// ── Monthly check-in ─────────────────────────────────────────────────────
async function runMonthly({ id, question, options, closeDays } = {}) {
  const open = store.openMonthly();
  if (open) return open;
  const s = monthlySettings(),
    now = new Date(),
    days = Number(closeDays) || s.closeDays,
    opts = (options?.length ? options : s.options).slice(0, 4),
    ring = store.addRing({
      id: id || `monthly-${Date.now()}`,
      kind: "poll",
      text: question || s.question,
      time: clock(now),
      options: opts,
      monthly: true,
      closesAt: new Date(now.getTime() + days * DAY_MS).toISOString(),
      discord: {
        head: "📬 Grandma’s monthly check-in",
        text: `${question || s.question}\nVoting closes in ${days} day${days === 1 ? "" : "s"}.`,
        actions: opts.map((o) => `🗳️ ${o}`),
      },
    });
  store.setSetting("monthly", { ...s, lastSentMonth: monthKey(now) });
  const posted = await bot.announce(ring);
  broadcast("monthly-open", {
    id: ring.id,
    month: monthName(now),
    question: ring.text,
    options: opts,
    sentAt: now.toISOString(),
    closesAt: ring.closesAt,
  });
  console.log(
    `📬 Monthly check-in sent${posted ? " → Discord" : ""}: "${ring.text}"`,
  );
  return ring;
}

async function closeMonthly(id) {
  const ring = store.getRing(id);
  if (!ring || ring.closed) return null;
  const results = ring.options
    .map((o) => [o, ring.votes.filter((v) => v === o).length])
    .sort((a, b) => b[1] - a[1]);
  store.closeRing(id);
  store.addReport({
    month: monthName(new Date(ring.closesAt)),
    question: ring.text,
    results,
    byChannel: ring.byChannel,
  });
  await bot.postResults(ring, results);
  broadcast("monthly-close", { id });
  console.log(
    `📊 Monthly check-in closed: ${results.map(([o, n]) => `${o} ${n}`).join(", ")}`,
  );
  return results;
}

// The schedule: send on the 1st at 10 AM (once a month), close when due.
function monthlyTick(now = new Date()) {
  const s = monthlySettings();
  if (
    now.getDate() === 1 &&
    now.getHours() >= 10 &&
    s.lastSentMonth !== monthKey(now)
  )
    runMonthly();
  for (const id of store.overdueMonthly(now)) closeMonthly(id);
}
setInterval(monthlyTick, 60_000);

function monthlyState() {
  const s = monthlySettings(),
    open = store.openMonthly(),
    next = new Date();
  next.setMonth(next.getMonth() + 1, 1);
  next.setHours(10, 0, 0, 0);
  return {
    question: s.question,
    options: s.options,
    closeDays: s.closeDays,
    trial: store.getSetting("trial", null),
    nextRun: next.toISOString(),
    current: open && {
      id: open.id,
      month: monthName(),
      question: open.text,
      options: open.options,
      closesAt: open.closesAt,
      votes: Object.fromEntries(
        open.options.map((o) => [o, open.votes.filter((v) => v === o).length]),
      ),
      byChannel: open.byChannel,
      open: true,
    },
    reports: store.reports(),
  };
}

// ── Discord ───────────────────────────────────────────────────────────────
const bot = startBot({
  token: process.env.DISCORD_TOKEN,
  channelId: process.env.DISCORD_CHANNEL_ID,
  suggestionsChannelId: process.env.DISCORD_SUGGESTIONS_CHANNEL_ID,
  roleId: process.env.DISCORD_ROLE_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  onVote: vote,
  onRing: createRing, // the /ring command in Discord
  lookupRing: (id) => store.getRing(id),
  onStatus: () => broadcast("status", health()),
});
const health = () => ({
  ok: true,
  discord: bot.ready,
  channel: bot.channelName,
  db: true,
});

// ── HTTP ──────────────────────────────────────────────────────────────────
async function readJson(req, limit = 16_000) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) throw new Error("too large");
  }
  return JSON.parse(body || "{}");
}
const send = (res, status, data) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
};
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function serveFile(req, res, pathname) {
  const rel = decodeURIComponent(pathname === "/" ? "/index.html" : pathname),
    file = path.resolve(ROOT, "." + rel),
    parts = path.relative(ROOT, file).split(path.sep);
  // Only the site itself: nothing outside the repo, no dotfiles, no server/.
  if (
    parts[0] === ".." ||
    parts.some((p) => p.startsWith(".")) ||
    ["server", "node_modules"].includes(parts[0])
  )
    return send(res, 404, { error: "not found" });
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] || "application/octet-stream",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    send(res, 404, { error: "not found" });
  }
}

// A ring from the Countertop's bell (POST /api/rings) or /ring in Discord.
async function createRing(b) {
  const id = text(b.id, 40);
  if (!id || !KINDS.has(b.kind) || !text(b.text, 300))
    return [400, { error: "need id, kind and text" }];
  const ring = store.addRing({
    id,
    kind: b.kind,
    text: text(b.text, 300),
    time: clock(),
    options: Array.isArray(b.options)
      ? b.options
          .map((o) => text(o, 60))
          .filter(Boolean)
          .slice(0, 4)
      : null,
    discord: {
      head: text(b.discord?.head, 200),
      text: text(b.discord?.text, 1000),
      actions: Array.isArray(b.discord?.actions)
        ? b.discord.actions.map((a) => text(a, 70)).slice(0, 4)
        : [],
    },
  });
  const posted = await bot.announce(ring);
  console.log(`🔔 ${ring.kind}: "${ring.text}"${posted ? " → Discord" : ""}`);
  return [201, { id, discord: posted }];
}

const routes = {
  "GET /api/health": () => health(),

  // Everything the Countertop needs for today, in one call.
  "GET /api/state": () => {
    seedToday();
    return {
      day: store.today(),
      finalPlan: store.getPlan(),
      rings: store.ringsForDay(),
      sales: store.salesForDay(),
      week: store.weekTotal(),
      monthly: monthlyState(),
    };
  },

  "PUT /api/plan": (b) => {
    const items = Array.isArray(b.items)
      ? b.items.slice(0, 12).map((i) => ({
          id: text(i.id, 30),
          emoji: text(i.emoji, 8),
          icon: text(i.icon, 30),
          name: text(i.name, 60),
          qty: Math.max(0, Math.min(Number(i.qty) || 0, 999)),
          when: text(i.when, 12),
        }))
      : [];
    store.savePlan({ at: text(b.at, 12) || clock(), items });
    return { ok: true };
  },

  "POST /api/day/reset": () => {
    store.resetDay();
    store.setSetting(`seeded:${store.today()}`, false);
    seedToday();
    return { ok: true };
  },

  "POST /api/rings": createRing,

  // Votes from anything that isn't the Discord bot (a text gateway, or a
  // quick test with curl).
  "POST /api/votes": (b) => {
    const r = vote({
      ringId: text(b.ringId, 40),
      name: text(b.name, 40),
      userId: text(b.userId, 80) || null,
      channel: text(b.channel, 20) || "text",
      choice: text(b.choice, 60),
    });
    return [r.ok ? 200 : 409, { ok: r.ok, reason: r.reason }];
  },

  // Receipts Grandma scanned (or typed in) on any screen.
  "POST /api/sales": (b) => {
    const amount = Math.round(Number(b.amount) * 100) / 100;
    if (!(amount > 0 && amount < 100_000) || !text(b.id, 40))
      return [400, { error: "need an id and an amount" }];
    const sale = {
      id: text(b.id, 40),
      time: text(b.time, 12) || clock(),
      amount,
      method: ["card", "cash"].includes(b.method) ? b.method : null,
      source: ["scan", "typed"].includes(b.source) ? b.source : "typed",
      items: Array.isArray(b.items)
        ? b.items
            .slice(0, 20)
            .map((i) => ({
              name: text(i.name, 60),
              amount: Math.max(0, Number(i.amount) || 0),
            }))
        : [],
    };
    store.addSale(sale);
    broadcast("sale", sale);
    console.log(
      `🧾 ${sale.time}: $${sale.amount.toFixed(2)}${sale.method ? ` (${sale.method})` : ""}`,
    );
    return [201, { ok: true }];
  },
  "POST /api/sales/remove": (b) => {
    const id = text(b.id, 40);
    if (store.removeSale(id)) broadcast("sale-removed", { id });
    return { ok: true };
  },
  "GET /api/sales": () => store.salesForDay(),

  "GET /api/rings": () => store.ringsForDay(),

  "GET /api/monthly": () => monthlyState(),
  "POST /api/monthly/options": (b) => {
    const s = monthlySettings(),
      options = Array.isArray(b.options)
        ? b.options
            .map((o) => text(o, 60))
            .filter(Boolean)
            .slice(0, 4)
        : s.options;
    store.setSetting("monthly", {
      ...s,
      question: text(b.question, 200) || s.question,
      options: options.length >= 2 ? options : s.options,
      closeDays: Math.max(1, Math.min(Number(b.closeDays) || s.closeDays, 14)),
    });
    return monthlyState();
  },
  "POST /api/monthly/run": async (b) => {
    const ring = await runMonthly({
      id: text(b.id, 40) || undefined,
      question: text(b.question, 200) || undefined,
      options: Array.isArray(b.options)
        ? b.options.map((o) => text(o, 60)).filter(Boolean)
        : undefined,
      closeDays: b.closeDays,
    });
    return { id: ring.id };
  },
  "POST /api/monthly/close": async (b) => {
    const id = text(b.id, 40) || store.openMonthly()?.id;
    return { results: id ? await closeMonthly(id) : null };
  },
  "POST /api/monthly/seen": () => {
    store.markLatestReportSeen();
    return { ok: true };
  },
  "POST /api/monthly/trial": (b) => {
    store.setSetting("trial", {
      name: text(b.name, 60),
      month: text(b.month, 20),
      day: text(b.day, 40),
    });
    return { ok: true };
  },
};

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && pathname === "/api/events") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      res.write(`event: status\ndata: ${JSON.stringify(health())}\n\n`);
      listeners.add(res);
      const beat = setInterval(() => res.write(": ping\n\n"), 25_000);
      req.on("close", () => {
        clearInterval(beat);
        listeners.delete(res);
      });
      return;
    }
    const route = routes[`${req.method} ${pathname}`];
    if (route) {
      const body = req.method === "GET" ? {} : await readJson(req),
        out = await route(body),
        [status, data] =
          Array.isArray(out) && typeof out[0] === "number" ? out : [200, out];
      return send(res, status, data);
    }
    if (pathname.startsWith("/api/"))
      return send(res, 404, { error: "no such endpoint" });
    if (req.method === "GET" || req.method === "HEAD")
      return serveFile(req, res, pathname);
    send(res, 405, { error: "method not allowed" });
  } catch (err) {
    send(res, 400, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Countertop running at http://localhost:${PORT}`);
  if (!process.env.DISCORD_TOKEN)
    console.log(
      "No DISCORD_TOKEN set: rings won't reach Discord (see server/README.md).",
    );
  monthlyTick();
});
