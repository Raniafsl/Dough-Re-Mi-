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
    options TEXT,
    discord TEXT,
    monthly INTEGER NOT NULL DEFAULT 0,
    closes_at TEXT,
    closed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY,
    ring_id TEXT NOT NULL REFERENCES rings(id),
    who TEXT NOT NULL,
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    choice TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (ring_id, who)
  );
  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    time TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT,
    items TEXT,
    source TEXT NOT NULL DEFAULT 'typed',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

// ── Rings (broadcasts) and poll votes ───────────────────────────────────
function rowToRing(r) {
  const ring = {
    id: r.id,
    kind: r.kind,
    text: r.text,
    time: r.time,
    options: parse(r.options),
    discord: parse(r.discord),
    monthly: !!r.monthly,
    closesAt: r.closes_at,
    closed: !!r.closed,
  };
  if (r.kind === "poll") {
    const votes = db
      .prepare(
        "SELECT channel, choice FROM votes WHERE ring_id = ? ORDER BY id",
      )
      .all(r.id);
    ring.votes = votes.map((v) => v.choice);
    ring.byChannel = votes.reduce(
      (m, v) => ((m[v.channel] = (m[v.channel] || 0) + 1), m),
      {},
    );
  }
  return ring;
}

export function addRing(ring) {
  db.prepare(
    `INSERT INTO rings (id, day, kind, text, time, options, discord, monthly, closes_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    ring.id,
    ring.day || today(),
    ring.kind,
    ring.text,
    ring.time,
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

// Votes on polls (bell polls and the monthly check-in). Everything else the
// bell sends is a broadcast. Returns { ok, reason?, vote }: one vote per
// person per poll, and only for an option that's on it.
export function addVote(ringId, { who, name, channel, choice }) {
  const r = db.prepare("SELECT * FROM rings WHERE id = ?").get(ringId);
  if (!r || r.closed) return { ok: false, reason: "gone" };
  if (r.kind !== "poll") return { ok: false, reason: "broadcast" };
  if (!parse(r.options)?.includes(choice))
    return { ok: false, reason: "choice" };
  try {
    db.prepare(
      "INSERT INTO votes (ring_id, who, name, channel, choice) VALUES (?, ?, ?, ?, ?)",
    ).run(ringId, who, name, channel, choice);
  } catch {
    return { ok: false, reason: "already" };
  }
  return { ok: true, vote: { choice, channel } };
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
    db.prepare("DELETE FROM votes WHERE ring_id = ?").run(id);
    db.prepare("DELETE FROM rings WHERE id = ?").run(id);
  }
  db.prepare("DELETE FROM plans WHERE day = ?").run(day);
  db.prepare("DELETE FROM sales WHERE day = ?").run(day);
}

// ── Sales (from scanned or typed-in receipts) ───────────────────────────
export function addSale(sale, day = today()) {
  db.prepare(
    "INSERT OR IGNORE INTO sales (id, day, time, amount, method, items, source) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    sale.id,
    day,
    sale.time,
    sale.amount,
    sale.method ?? null,
    json(sale.items || []),
    sale.source || "typed",
  );
}
export const removeSale = (id) =>
  db.prepare("DELETE FROM sales WHERE id = ?").run(id).changes > 0;
export const salesForDay = (day = today()) =>
  db
    .prepare(
      "SELECT id, time, amount, method, items, source FROM sales WHERE day = ? ORDER BY created_at, rowid",
    )
    .all(day)
    .map((r) => ({ ...r, items: parse(r.items) || [] }));
export const salesCount = (day = today()) =>
  db.prepare("SELECT COUNT(*) AS n FROM sales WHERE day = ?").get(day).n;

// Monday to today, in dollars.
export function weekTotal(now = new Date()) {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return db
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) AS t FROM sales WHERE day >= ? AND day <= ?",
    )
    .get(monday.toLocaleDateString("en-CA"), today()).t;
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
