# Countertop: who owns what, and how the parts talk

**The demo, in about 60 seconds.** Grandma opens Countertop and taps the recipe card ("midterms week, bake extra cookies"), adjusts it and finalises the plan. Later she holds the bell and says "six parfaits left, half price"; it goes out to Discord, Instagram and text at once. As the day goes on she scans her receipts, and the parfait on the big screen builds toward today's goal. A letter on the counter holds the monthly report on what the neighbours want next.

Every part talks to the others only through the **hub** (`hub.js`), so each part can be built and demoed on its own.

## The four parts

| Part                                      | Owner | Files                                                       | Done when                                                                                    |
| ----------------------------------------- | ----- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1 · Countertop home, recipe card, parfait |       | `index.html`, `countertop.js`, `countertop.css`, `icons.js` | The plan sheet finalises; the parfait gains a layer for every receipt                        |
| 2 · Bell flow and receipts                |       | `bell.js`, `receipts.js`                                    | Voice or typing, four picture buttons, three live previews, ding; a receipt scans to a total |
| 3 · Hub                                   |       | `hub.js`, `server/server.js`, `server/store.js`             | Plan data, rewriting, broadcasts, sales, votes, the monthly check-in                         |
| 4 · Discord bot and the pitch             |       | `server/bot.js`, the slides                                 | A ring appears in the channel; poll buttons count votes                                      |

## The hub, in the browser (`Hub.*`)

| Call                                                                                                                                            | Returns                                                                          | Notes                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Hub.plan()`                                                                                                                                    | `{ reason, items: [{ id, icon, name, qty, step, when, why }], agenda }`          | Today's suggestions (hardcoded), plus a trial batch if Grandma added one from the monthly report |
| `Hub.finalPlan()` / `Hub.finalisePlan(items)`                                                                                                   | `null` or `{ at, items }`                                                        | Grandma's accepted plan, saved for the day                                                       |
| `Hub.kinds`                                                                                                                                     | `{ treats, special, event, poll }`, each `{ icon, emoji, label, head, example }` | The four picture buttons                                                                         |
| `Hub.rewrite(kind, sentence)`                                                                                                                   | `{ text, insta, discord: { head, text, actions[] }, sms, read }`                 | Rule-based; swap in an AI rewrite without changing the shape. Only polls have `actions`          |
| `Hub.ring({ kind, text })`                                                                                                                      | `ring`                                                                           | A broadcast to every channel; polls also collect votes                                           |
| `Hub.onVote(fn)`                                                                                                                                | –                                                                                | `fn(ring)` when a bell poll gets a vote                                                          |
| `Hub.addSale({ amount, method, items, source })` / `Hub.removeSale(id)`                                                                         | `sale` / –                                                                       | A receipt; `method` is `card`, `cash` or `null`; `source` is `scan` or `typed`                   |
| `Hub.onSales(fn)`                                                                                                                               | –                                                                                | `fn({ type: "added", sale })` or `fn({ type: "removed", id })`                                   |
| `Hub.summary()`                                                                                                                                 | `{ goal, today, count, average, week, byMethod, items, sales, rings }`           | Feeds the parfait                                                                                |
| `Hub.monthly()`, `Hub.setMonthly()`, `Hub.runMonthly()`, `Hub.closeMonthlyNow()`, `Hub.markReportSeen()`, `Hub.addTrial()`, `Hub.onMonthly(fn)` | see `hub.js`                                                                     | The monthly check-in letter                                                                      |
| `Hub.mode()` / `Hub.onMode(fn)`                                                                                                                 | `{ live, discord, channel }`                                                     | The header chip and the bell's "sent" message                                                    |
| `Hub.onSync(fn)`                                                                                                                                | –                                                                                | After the page reloads today from the server                                                     |
| `Hub.newDay()`                                                                                                                                  | –                                                                                | Demo reset                                                                                       |

Rule: Parts 1 and 2 never call `fetch`, read storage or talk to Discord. If they need something, it goes in the hub.

## Two modes, same calls

- **Live** (served by `server/`): the SQLite database is the source of truth, rings go on to Discord, and sales and votes from any screen stream in.
- **Demo** (opened any other way): everything stays in the browser, and bell polls and the monthly check-in get simulated votes.

## The server (`server/`)

```
Countertop ──POST /api/rings──► server ──posts the message (+ vote buttons for polls)──► Discord
Countertop ──POST /api/sales──► server (SQLite) ──GET /api/events (SSE)──► every open Countertop
Discord poll taps ────────────► server ◄── POST /api/votes (text gateway, or curl for testing)
```

| Endpoint                                                                             | Body                                                                                          | Reply                                                                     |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `GET /api/health`                                                                    | –                                                                                             | `{ ok, discord, channel, db }`                                            |
| `GET /api/state`                                                                     | –                                                                                             | Today in one call: `{ day, finalPlan, rings, sales, week, monthly }`      |
| `PUT /api/plan`                                                                      | `{ at, items }`                                                                               | Saves today's finalised plan                                              |
| `POST /api/rings`                                                                    | `{ id, kind, text, options?, discord: { head, text, actions } }`                              | `201 { id, discord }`                                                     |
| `POST /api/sales`                                                                    | `{ id, time, amount, method, source, items[] }`                                               | `201`                                                                     |
| `POST /api/sales/remove`                                                             | `{ id }`                                                                                      | Removes a receipt                                                         |
| `POST /api/votes`                                                                    | `{ ringId, name, channel, userId?, choice }`                                                  | `{ ok, reason? }`; `reason` is `broadcast`, `already`, `gone` or `choice` |
| `GET /api/events`                                                                    | Server-sent events: `sale`, `sale-removed`, `vote`, `monthly-open`, `monthly-close`, `status` | –                                                                         |
| `POST /api/day/reset`                                                                | –                                                                                             | Demo reset: clears today and re-seeds two morning receipts                |
| `GET /api/monthly`, `POST /api/monthly/options`, `/run`, `/close`, `/seen`, `/trial` | –                                                                                             | The monthly check-in (the schedule sends and closes it on its own)        |

The server is the single judge of a vote: one per person per poll, only for listed options, and never on a broadcast. Setup and Discord steps are in [server/README.md](server/README.md); secrets live in `server/.env` (git-ignored).

## Demo checklist

1. `cd server && npm start`, open http://localhost:3000, and check the header says **● Live on Discord**.
2. Tap the parfait → **Start a fresh day**, so the glass starts with the two morning receipts.
3. Tap the recipe card → adjust if needed → **Finalise today's plan ✓**.
4. Tap the bell → **Treats** → 🎙️ "six parfaits left, half price" → **Ring the bell**. Show the message arriving in Discord.
5. Tap the parfait → **Scan a receipt** (or **Try a sample receipt**) → check the total → **Add to today ✓**. Repeat; the parfait builds.
6. Tap the letter on the counter for the monthly report → **Add a trial batch to today's plan**.
