// PART 3 · The hub server. Serves the Countertop, takes rings from it,
// hands them to the Discord bot, and streams every claim back to the page.
//
//   npm start            (from server/, reads server/.env if present)
//
// See CONTRACT.md for the endpoints.

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { startBot } from "./bot.js";

const ROOT = path.resolve(import.meta.dirname, ".."),
  PORT = Number(process.env.PORT) || 3000,
  KINDS = new Set(["treats", "special", "event", "poll"]),
  CHANNELS = new Set(["discord", "text", "instagram"]),
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

// Rings live in memory for the evening; the page keeps its own copy.
const rings = new Map(),
  listeners = new Set();

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of listeners) res.write(msg);
}

// One place decides whether a claim counts: sold out, already claimed, or a
// vote for an option that doesn't exist are all turned away here.
export function claim({ ringId, name, userId, channel, choice }) {
  const ring = rings.get(ringId);
  if (!ring) return { ok: false, reason: "gone" };
  if (!CHANNELS.has(channel)) return { ok: false, reason: "channel" };
  const who = userId || `${channel}:${name}`;
  if (ring.who.has(who)) return { ok: false, reason: "already", ring };
  if (ring.kind === "poll") {
    if (!ring.options?.includes(choice))
      return { ok: false, reason: "choice", ring };
  } else if (ring.limit && ring.claims.length >= ring.limit) {
    return { ok: false, reason: "soldout", ring };
  }
  ring.who.add(who);
  const entry = {
    name: String(name || "A student").slice(0, 40),
    channel,
    amount: ring.kind === "poll" ? 0 : ring.amount,
    item: ring.item,
    rescued: ring.kind === "treats",
    ...(ring.kind === "poll" ? { choice } : {}),
  };
  ring.claims.push(entry);
  broadcast("claim", { ringId, claim: entry });
  const remaining = ring.limit ? ring.limit - ring.claims.length : null;
  if (remaining === 0) broadcast("soldout", { ringId });
  return { ok: true, remaining, ring };
}

const bot = startBot({
  token: process.env.DISCORD_TOKEN,
  channelId: process.env.DISCORD_CHANNEL_ID,
  onClaim: claim,
  onStatus: () => broadcast("status", health()),
});

const health = () => ({
  ok: true,
  discord: bot.ready,
  channel: bot.channelName,
});

async function readJson(req, limit = 16_000) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) throw new Error("too large");
  }
  return JSON.parse(body || "{}");
}
const json = (res, status, data) => {
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
    return json(res, 404, { error: "not found" });
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] || "application/octet-stream",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    json(res, 404, { error: "not found" });
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && pathname === "/api/health")
      return json(res, 200, health());

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

    if (req.method === "POST" && pathname === "/api/rings") {
      const b = await readJson(req),
        id = text(b.id, 40);
      if (!id || !KINDS.has(b.kind) || !text(b.text, 300))
        return json(res, 400, { error: "need id, kind and text" });
      const ring = {
        id,
        kind: b.kind,
        text: text(b.text, 300),
        limit:
          Number.isInteger(b.limit) && b.limit > 0
            ? Math.min(b.limit, 500)
            : null,
        amount: Math.max(0, Math.min(Number(b.amount) || 0, 1000)),
        item: text(b.item, 60) || "Treat",
        options: Array.isArray(b.options)
          ? b.options
              .map((o) => text(o, 60))
              .filter(Boolean)
              .slice(0, 3)
          : null,
        discord: {
          head: text(b.discord?.head, 200),
          text: text(b.discord?.text, 1000),
          actions: Array.isArray(b.discord?.actions)
            ? b.discord.actions.map((a) => text(a, 70)).slice(0, 3)
            : [],
        },
        claims: [],
        who: new Set(),
      };
      rings.set(id, ring);
      const posted = await bot.announce(ring);
      console.log(
        `🔔 ${ring.kind}: "${ring.text}"${posted ? " → Discord" : ""}`,
      );
      return json(res, 201, { id, discord: posted });
    }

    // Claims from anything that isn't the Discord bot (a text gateway, or a
    // quick test with curl).
    if (req.method === "POST" && pathname === "/api/claims") {
      const b = await readJson(req),
        r = claim({
          ringId: text(b.ringId, 40),
          name: text(b.name, 40),
          userId: text(b.userId, 80) || null,
          channel: text(b.channel, 20) || "text",
          choice: text(b.choice, 60) || undefined,
        });
      return json(res, r.ok ? 200 : 409, {
        ok: r.ok,
        reason: r.reason,
        remaining: r.remaining ?? null,
      });
    }

    if (req.method === "GET" && pathname === "/api/rings")
      return json(
        res,
        200,
        [...rings.values()].map(({ who, ...r }) => r),
      );

    if (req.method === "GET" || req.method === "HEAD")
      return serveFile(req, res, pathname);
    json(res, 405, { error: "method not allowed" });
  } catch (err) {
    json(res, 400, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Countertop running at http://localhost:${PORT}`);
  if (!process.env.DISCORD_TOKEN)
    console.log(
      "No DISCORD_TOKEN set: rings won't reach Discord (see server/README.md).",
    );
});
