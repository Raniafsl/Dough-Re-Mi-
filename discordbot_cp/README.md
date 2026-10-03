# Grandma's Countertop: Discord bot

Broadcasts Grandma's bell rings to `#treats` with a role ping, and runs
"what should Grandma bake next?" polls in `#suggestions` so the app can
add the winning treat to her recipe cards.

## Discord setup (about 15 min)

1. Make a server with a `#treats` channel, a `#suggestions` channel and a role called `Treat Alerts`.
2. At discord.com/developers: **New Application** → **Bot** → **Reset Token**, then copy it.
3. On the Bot page, turn on **Server Members Intent**.
4. **OAuth2 → URL Generator**: scopes `bot` + `applications.commands`; permissions **Send Messages**, **Embed Links**, **Manage Roles**, **Mention Everyone**. Open the URL to invite the bot.
5. **Server Settings → Roles**: drag the bot's role above `Treat Alerts`.
6. Server Settings: set Default Notifications to **All Messages**.

## Run it (about 10 min)

Create `.env` (see `.env.example`), then:

```bash
npm install
npm run deploy           # registers /ring (run once)
npm start
```

## For the app teammate

The bot runs on `http://<bot-machine>:3001`. All responses have `"ok": true` or `"ok": false` with an `"error"`.

### 1. Broadcast: `POST /ring`

```json
{ "type": "treats", "text": "Six parfaits left, half price!" }
```

| Field | Required | Notes |
|---|---|---|
| `type` | yes | `treats`, `special` or `event` → posted in `#treats` |
| `text` | yes | The message |

### 2. Start a suggestions poll: `POST /ring` with `type: "poll"`

Send the treats Grandma picked from her library. Posted in `#suggestions`.

```json
{
  "type": "poll",
  "text": "What should Grandma bake next?",
  "options": ["Maple cookies", "Apple crumble", "Pumpkin bread"],
  "durationHours": 24
}
```

| Field | Required | Notes |
|---|---|---|
| `text` | yes | The question (up to 300 characters) |
| `options` | yes | 2–10 treat names, each up to 55 characters |
| `durationHours` | no | 1–768 hours, default 24 |

Returns `{ "ok": true, "messageId": "..." }`. **Save `messageId`**, you need it for results.

### 3. Live results: `GET /polls/<messageId>`

Call every few seconds to animate vote bars.

```json
{
  "ok": true,
  "question": "What should Grandma bake next?",
  "answers": [
    { "text": "Maple cookies", "votes": 3 },
    { "text": "Apple crumble", "votes": 5 },
    { "text": "Pumpkin bread", "votes": 1 }
  ],
  "totalVotes": 9,
  "winner": "Apple crumble",
  "tie": false,
  "leaders": ["Apple crumble"],
  "finished": false,
  "resultsFinal": false
}
```

- `winner` is `null` if nobody has voted.
- If `tie` is `true`, `leaders` lists every tied treat, so the app can let Grandma pick.

### 4. Close the poll now: `POST /polls/<messageId>/end`

Ends voting immediately (handy for the demo) and returns the same JSON as above.
Add `winner` to Grandma's recipe cards.

### Health check: `GET /health`

Returns whether the bot is connected to Discord.

## Test from a terminal

```bash
curl -X POST localhost:3001/ring -H "Content-Type: application/json" \
  -d '{"type":"poll","text":"What should Grandma bake next?","options":["Maple cookies","Apple crumble"]}'
# copy the messageId, vote in Discord, then:
curl localhost:3001/polls/PASTE_MESSAGE_ID
curl -X POST localhost:3001/polls/PASTE_MESSAGE_ID/end
```

## If something breaks

- **Missing Permissions (50013):** the bot's role is below `Treat Alerts`, or it can't post in the channel.
- **Used disallowed intents:** turn on Server Members Intent in the portal.
- **Polls show up in #treats:** `SUGGESTIONS_CHANNEL_ID` is missing from `.env`.
- **Mention shows but no buzz:** check the server's Default Notifications setting.
- **/ring missing:** run `npm run deploy` again, then press Ctrl+R in Discord.