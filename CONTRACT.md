# Countertop: who owns what, and how the parts talk

The demo, in about 60 seconds: Grandma opens Countertop and flips the recipe card ("midterms week, bake extra cookies"). Later she holds the bell and says "six parfaits left, half price." The judges' phones ping in Discord, they claim, and the parfait keeps building on the big screen.

Every part talks to the others only through the **hub** (`hub.js`). Each part can be built and demoed on its own because the hub ships as a working stub.

## The four parts

| Part                                | Owner | Files                                           | Done when                                                                               |
| ----------------------------------- | ----- | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1 · Countertop home and recipe card |       | `index.html`, `countertop.js`, `countertop.css` | The card flips, "Sounds good" stamps the plan, the parfait gains a layer on every claim |
| 2 · Bell flow                       |       | `bell.js` (+ the bell sheet in `index.html`)    | Voice or typing, four picture buttons, three live previews, ding                        |
| 3 · Hub                             |       | `hub.js`, later `server/`                       | Plan data, AI rewrite, rings out, claims in, totals                                     |
| 4 · Discord bot and the pitch       |       | `bot/`, the slides                              | Judges get a ping with a Claim button and the claim reaches the hub                     |

## The hub, in the browser (`Hub.*`)

| Call                                          | Returns                                                                                 | Notes                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `Hub.plan()`                                  | `{ reason, items: [{ id, emoji, icon, name, qty, step, when, why }], agenda }`          | Today's suggestions, hardcoded for the demo                       |
| `Hub.finalPlan()` / `Hub.finalisePlan(items)` | `null` or `{ at, items }` / –                                                           | Grandma's accepted plan, saved for the day                        |
| `Hub.mode()` / `Hub.onMode(fn)`               | `{ live, discord, channel }`                                                            | Drives the header chip and the bell's "sent" message              |
| `Hub.kinds`                                   | `{ treats, special, event, poll }`, each `{ emoji, label, head, example }`              | The four picture buttons                                          |
| `Hub.rewrite(kind, sentence)`                 | `{ text, insta: { emoji, head, text }, discord: { head, text, actions[] }, sms, read }` | Rule-based now; swap in the AI rewrite without changing the shape |
| `Hub.ring({ kind, text })`                    | `ring` `{ id, kind, text, time, claims: [] }`                                           | Sends to every channel                                            |
| `Hub.onClaim(fn)`                             | –                                                                                       | `fn(claim, ring)` for every claim from any channel                |
| `Hub.onRingDone(fn)`                          | –                                                                                       | `fn(ring)` when replies settle (stub only; live mode can skip it) |
| `Hub.summary()`                               | `{ goal, tonight, week, claims, rescued, seats, votes, byChannel, sold, rings }`        | Feeds the parfait                                                 |
| `Hub.newDay()`                                | –                                                                                       | Demo reset                                                        |

A **claim** is `{ name, channel: "discord" | "text" | "instagram", amount, item, rescued, choice? }`. `choice` is set only for poll votes.

Rule: Parts 1 and 2 never read `localStorage`, call `fetch` or talk to Discord. If they need something, it goes in the hub.

## Stub mode (what runs today)

`hub.js` keeps everything in the browser and simulates student replies a few seconds after each ring, so Parts 1 and 2 can be built and demoed without a server or a bot.

## Live mode (built: `server/`)

`server/server.js` serves the Countertop and runs the Discord bot (`server/bot.js`) in the same process. When the page is opened from that server, `hub.js` finds `/api/health` and switches to live mode on its own; the `Hub.*` calls stay the same.

```
Countertop ──POST /api/rings──────► server ──posts card + buttons──► Discord #campus-eats
Countertop ◄──GET /api/events (SSE)── server ◄──button taps──────────── judges
                                       ▲
                     POST /api/claims ─┘  (text gateway, or curl for testing)
```

| Endpoint           | Body                                                                                               | Reply                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `GET /api/health`  | –                                                                                                  | `{ ok, discord, channel }`                                                         |
| `POST /api/rings`  | `{ id, kind, text, limit, amount, item, options, discord: { head, text, actions } }`               | `201 { id, discord }`                                                              |
| `POST /api/claims` | `{ ringId, name, channel: "discord" \| "text" \| "instagram", userId?, choice? }`                  | `{ ok, reason?, remaining }`; `reason` is `soldout`, `already`, `gone` or `choice` |
| `GET /api/events`  | Server-sent events: `claim { ringId, claim }`, `soldout { ringId }`, `status { discord, channel }` | –                                                                                  |
| `GET /api/rings`   | –                                                                                                  | Tonight's rings with their claims                                                  |

The server is the single judge of whether a claim counts: one claim per person per ring, never more than the ring's limit, and poll votes only for listed options. Setup and Discord steps are in [server/README.md](server/README.md). Secrets live in `server/.env` (git-ignored).

## Demo checklist

1. `cd server && npm start`, open http://localhost:3000, and check the header says **● Live on Discord**.
2. Tap **Start a fresh day** in the parfait sheet, so the glass starts at the lunch ring.
3. Tap the recipe card → adjust if needed → **Finalise today's plan ✓**.
4. Tap the bell → 🍪 **Treats** → 🎙️ "six parfaits left, half price" → **Ring the bell**.
5. Judges claim in Discord, the parfait builds, then tap it for tonight's totals.
