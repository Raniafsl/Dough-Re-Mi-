// The bakery's data, kept in a small SQLite file (server/countertop.db) so it
// survives restarts and is the same in every browser.

import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const db = new DatabaseSync(
  process.env.DB_PATH || path.join(import.meta.dirname, "countertop.db"),
);

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS rings (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    time TEXT NOT NULL,
    limit_n INTEGER,
    amount REAL NOT NULL DEFAULT 0,
    item TEXT NOT NULL DEFAULT 'Treat',
    options TEXT,
    discord TEXT,
    monthly INTEGER NOT NULL DEFAULT 0,
    closes_at TEXT,
    closed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY,
    ring_id TEXT NOT NULL REFERENCES rings(id),
    who TEXT NOT NULL,
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    item TEXT,
    rescued INTEGER NOT NULL DEFAULT 0,
    choice TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (ring_id, who)
  );
  CREATE TABLE IF NOT EXISTS plans (
    day TEXT PRIMARY KEY,
    at TEXT NOT NULL,
    items TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY,
    month TEXT NOT NULL,
    question TEXT NOT NULL,
    results TEXT NOT NULL,
    by_channel TEXT NOT NULL,
    seen INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const json = (v) => (v == null ? null : JSON.stringify(v)),
  parse = (v) => (v == null ? null : JSON.parse(v));

export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

// ── Settings ────────────────────────────────────────────────────────────
export function getSetting(key, fallback) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? parse(row.value) : fallback;
}
export function setSetting(key, value) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, json(value));
}

// ── Rings and claims ────────────────────────────────────────────────────
function rowToRing(r) {
  const claims = db
    .prepare(
      "SELECT name, channel, amount, item, rescued, choice FROM claims WHERE ring_id = ? ORDER BY id",
    )
    .all(r.id)
    .map((c) => ({
      ...c,
      rescued: !!c.rescued,
      choice: c.choice ?? undefined,
    }));
  const ring = {
    id: r.id,
    kind: r.kind,
    text: r.text,
    time: r.time,
    limit: r.limit_n,
    amount: r.amount,
    item: r.item,
    options: parse(r.options),
    discord: parse(r.discord),
    monthly: !!r.monthly,
    closesAt: r.closes_at,
    closed: !!r.closed,
  };
  if (r.kind === "poll") {
    ring.votes = claims.map((c) => c.choice);
    ring.claims = [];
    ring.byChannel = claims.reduce(
      (m, c) => ((m[c.channel] = (m[c.channel] || 0) + 1), m),
      {},
    );
  } else ring.claims = claims;
  return ring;
}

export function addRing(ring) {
  db.prepare(
    `INSERT INTO rings (id, day, kind, text, time, limit_n, amount, item, options, discord, monthly, closes_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    ring.id,
    ring.day || today(),
    ring.kind,
    ring.text,
    ring.time,
    ring.limit ?? null,
    ring.amount ?? 0,
    ring.item || "Treat",
    json(ring.options),
    json(ring.discord),
    ring.monthly ? 1 : 0,
    ring.closesAt ?? null,
  );
  return getRing(ring.id);
}

export function getRing(id) {
  const r = db.prepare("SELECT * FROM rings WHERE id = ?").get(id);
  return r ? rowToRing(r) : null;
}

export const ringsForDay = (day = today()) =>
  db
    .prepare(
      "SELECT * FROM rings WHERE day = ? AND monthly = 0 ORDER BY created_at, rowid",
    )
    .all(day)
    .map(rowToRing);

// Returns { ok, reason?, remaining, claim }. One claim per person per ring,
// never past the limit, poll votes only for listed options.
export function addClaim(ringId, { who, name, channel, choice }) {
  const r = db.prepare("SELECT * FROM rings WHERE id = ?").get(ringId);
  if (!r || r.closed) return { ok: false, reason: "gone" };
  const options = parse(r.options);
  if (r.kind === "poll" && !options?.includes(choice))
    return { ok: false, reason: "choice" };
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM claims WHERE ring_id = ?")
    .get(ringId).n;
  if (r.kind !== "poll" && r.limit_n && count >= r.limit_n)
    return { ok: false, reason: "soldout" };
  const claim = {
    name,
    channel,
    amount: r.kind === "poll" ? 0 : r.amount,
    item: r.item,
    rescued: r.kind === "treats",
    ...(r.kind === "poll" ? { choice } : {}),
  };
  try {
    db.prepare(
      "INSERT INTO claims (ring_id, who, name, channel, amount, item, rescued, choice) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      ringId,
      who,
      name,
      channel,
      claim.amount,
      claim.item,
      claim.rescued ? 1 : 0,
      choice ?? null,
    );
  } catch {
    return { ok: false, reason: "already" };
  }
  return {
    ok: true,
    remaining: r.limit_n ? r.limit_n - count - 1 : null,
    claim,
  };
}

export function closeRing(id) {
  db.prepare("UPDATE rings SET closed = 1 WHERE id = ?").run(id);
}

export function resetDay(day = today()) {
  const ids = db
    .prepare("SELECT id FROM rings WHERE day = ? AND monthly = 0")
    .all(day)
    .map((r) => r.id);
  for (const id of ids) {
    db.prepare("DELETE FROM claims WHERE ring_id = ?").run(id);
    db.prepare("DELETE FROM rings WHERE id = ?").run(id);
  }
  db.prepare("DELETE FROM plans WHERE day = ?").run(day);
}

// ── Plans ───────────────────────────────────────────────────────────────
export function getPlan(day = today()) {
  const p = db.prepare("SELECT at, items FROM plans WHERE day = ?").get(day);
  return p ? { at: p.at, items: parse(p.items) } : null;
}
export function savePlan({ at, items }, day = today()) {
  db.prepare(
    "INSERT INTO plans (day, at, items) VALUES (?, ?, ?) ON CONFLICT(day) DO UPDATE SET at = excluded.at, items = excluded.items",
  ).run(day, at, json(items));
}

// ── Monthly check-in ────────────────────────────────────────────────────
export function openMonthly() {
  const r = db
    .prepare(
      "SELECT * FROM rings WHERE monthly = 1 AND closed = 0 ORDER BY created_at DESC LIMIT 1",
    )
    .get();
  return r ? rowToRing(r) : null;
}
export function overdueMonthly(now = new Date()) {
  return db
    .prepare(
      "SELECT id FROM rings WHERE monthly = 1 AND closed = 0 AND closes_at <= ?",
    )
    .all(now.toISOString())
    .map((r) => r.id);
}
export function addReport({ month, question, results, byChannel }) {
  db.prepare(
    "INSERT INTO reports (month, question, results, by_channel) VALUES (?, ?, ?, ?)",
  ).run(month, question, json(results), json(byChannel));
}
export const reports = () =>
  db
    .prepare("SELECT * FROM reports ORDER BY id DESC LIMIT 12")
    .all()
    .map((r) => ({
      id: r.id,
      month: r.month,
      question: r.question,
      results: parse(r.results),
      byChannel: parse(r.by_channel),
      seen: !!r.seen,
    }));
export function markLatestReportSeen() {
  db.prepare(
    "UPDATE reports SET seen = 1 WHERE id = (SELECT MAX(id) FROM reports)",
  ).run();
}
export const reportCount = () =>
  db.prepare("SELECT COUNT(*) AS n FROM reports").get().n;
