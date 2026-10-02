# Countertop server and Discord bot

One Node process is the bakery's backend:

- serves the Countertop at `http://localhost:3000`,
- stores today's plan, every ring and claim, and the monthly reports in a SQLite database (`server/countertop.db`, created on first run, git-ignored), so nothing is lost on a refresh or restart and every screen shows the same thing,
- posts every bell ring in your Discord channel with **Claim** (or vote) buttons,
- streams each claim back to the page, so the parfait builds live,
- runs the **monthly check-in** by itself: on the 1st of each month at 10 AM it posts a “what would you like to see?” poll, closes it after the set number of days (3 by default), posts the results in Discord, and files a report for Grandma.

Without a Discord token it still runs: the page shows **● Server on · Discord not connected**, and you can send test claims with `curl` (below).

## Run it

Needs Node 22.9 or newer.

```bash
cd server
npm install
npm start
```

Then open http://localhost:3000. Opening `index.html` any other way (a file, or `python3 -m http.server`) runs the stand-in mode with simulated replies instead.

## Connect the Discord bot (about 5 minutes)

1. Go to https://discord.com/developers/applications → **New Application**, and name it “Grandma’s Bakeria”.
2. **Bot** tab → **Reset Token** → copy the token. Treat it like a password.
3. **OAuth2 → URL Generator**: tick the `bot` scope, then the **View Channels**, **Send Messages** and **Embed Links** permissions. Open the generated link and add the bot to your server.
4. In Discord, turn on **Settings → Advanced → Developer Mode**, then right-click the channel the bot should post in (for example `#campus-eats`) → **Copy Channel ID**.
5. Copy `.env.example` to `.env` and fill it in:

   ```
   DISCORD_TOKEN=paste-the-bot-token
   DISCORD_CHANNEL_ID=paste-the-channel-id
   ```

6. Run `npm start`. You should see `🤖 … is posting in #campus-eats`, and the Countertop header turns green: **● Live on Discord #campus-eats**.

`.env` is in `.gitignore`, so it is never committed. If a token is ever shared by accident, reset it in the developer portal.

## What judges see in Discord

Grandma rings “six parfaits left, half price” and the bot posts a pink card in the channel with a **🍪 Claim one** button and “6, first come first served”. Each tap:

- replies privately to that person (“🧁 Saved one for you, Maya! Pick it up at the counter… 5 left.”),
- adds a layer to the parfait on the Countertop,
- turns away second claims from the same person, and taps after the last one (“Sorry, they’re all claimed”),
- switches the button to **All claimed. Thank you!** when the last one goes.

Polls get one button per option, and events get **✅ I’m coming**.

## Test without Discord

With the server running and a ring sent from the Countertop:

```bash
curl -s localhost:3000/api/rings
```

Copy the `id` of the latest ring, then claim it as if by text message:

```bash
curl -s -X POST localhost:3000/api/claims -H 'content-type: application/json' -d '{"ringId":"PASTE-ID","name":"Maya","channel":"text"}'
```

The parfait on the page gains a layer straight away.

## The monthly check-in

Grandma edits the question and up to four choices from the letter on her counter (“Save for next month”). The server sends it on the 1st; for a demo, **Send it now** in the same sheet sends it straight away, and **Close voting now** files the report immediately. To test the schedule without waiting, `POST /api/monthly/run` and `POST /api/monthly/close` do the same thing.

## Limits of this build

- Delete `server/countertop.db` to start completely fresh.
- Instagram and text messages are previews only; the `/api/claims` endpoint is where a text gateway (for example Twilio) would post replies.
- Anyone who can reach port 3000 can post a claim, so run it on your own laptop or network for the demo.
