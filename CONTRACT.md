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

| Call                                  | Returns                                                                                 | Notes                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `Hub.plan()`                          | `{ items: [{ emoji, name, qty, note }], reason }`                                       | Hardcoded for the demo                                            |
| `Hub.planned()` / `Hub.confirmPlan()` | `boolean` / –                                                                           | "Sounds good 👍"                                                  |
| `Hub.kinds`                           | `{ treats, special, event, poll }`, each `{ emoji, label, head, example }`              | The four picture buttons                                          |
| `Hub.rewrite(kind, sentence)`         | `{ text, insta: { emoji, head, text }, discord: { head, text, actions[] }, sms, read }` | Rule-based now; swap in the AI rewrite without changing the shape |
| `Hub.ring({ kind, text })`            | `ring` `{ id, kind, text, time, claims: [] }`                                           | Sends to every channel                                            |
| `Hub.onClaim(fn)`                     | –                                                                                       | `fn(claim, ring)` for every claim from any channel                |
| `Hub.onRingDone(fn)`                  | –                                                                                       | `fn(ring)` when replies settle (stub only; live mode can skip it) |
| `Hub.summary()`                       | `{ goal, tonight, week, claims, rescued, seats, votes, byChannel, sold, rings }`        | Feeds the parfait                                                 |
| `Hub.newDay()`                        | –                                                                                       | Demo reset                                                        |

A **claim** is `{ name, channel: "discord" | "text" | "instagram", amount, item, rescued, choice? }`. `choice` is set only for poll votes.

Rule: Parts 1 and 2 never read `localStorage`, call `fetch` or talk to Discord. If they need something, it goes in the hub.

## Stub mode (what runs today)

`hub.js` keeps everything in the browser and simulates student replies a few seconds after each ring, so Parts 1 and 2 can be built and demoed without a server or a bot.

## Live mode (for the demo)

The hub keeps the same `Hub.*` calls but swaps the stub's internals for a small server (`server/`) and the Discord bot (`bot/`):

```
Countertop ──POST /rings──────────► hub server ──POST /announce──► Discord bot ──► #campus-eats
Countertop ◄──GET /events (SSE)──── hub server ◄──POST /claims──── Discord bot ◄── judge taps Claim
```

| Endpoint                         | Body                                                          | Reply                                                |
| -------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| `POST /rings` (browser → server) | `{ kind, text, discord: { head, text, actions } }`            | `{ id }`                                             |
| `POST /announce` (server → bot)  | `{ ringId, kind, head, text, actions }`                       | `204`                                                |
| `POST /claims` (bot → server)    | `{ ringId, name, channel: "discord", choice? }`               | `{ ok, remaining }`; `ok: false` once treats run out |
| `GET /events` (browser ← server) | Server-sent events, `event: claim`, `data: { claim, ringId }` | The page calls the same `onClaim` listeners          |

The bot posts one embed per ring, with a button per entry in `actions` (`🍪 Claim one`, `✅ I'm coming`, or one per poll option). When a judge taps it, the bot posts to `/claims` using their Discord display name and replies only to that judge ("Saved for you, pick up at the counter").

Bot and server secrets (`DISCORD_TOKEN`, `CHANNEL_ID`) live in environment variables, never in the repo.

## Demo checklist

1. Clear the browser data (or tap **Start a fresh day** in the parfait sheet), so the glass starts at the lunch ring.
2. Flip the recipe card → **Sounds good 👍**.
3. Tap the bell → 🍪 **Treats** → 🎙️ "six parfaits left, half price" → **Ring the bell**.
4. Judges claim in Discord, the parfait builds, then tap it for tonight's totals.
