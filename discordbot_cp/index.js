// Grandma's Countertop: Discord broadcast bot
//
// The app (hub) talks to this bot over HTTP:
//   POST /ring                   → posts a broadcast in #treats (with a role ping)
//                                  or a poll in #suggestions
//   GET  /polls/:messageId       → live vote counts + current winner
//   POST /polls/:messageId/end   → closes the poll early and returns the winner

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';

const { DISCORD_TOKEN, CHANNEL_ID, ROLE_ID } = process.env;
// Polls go to their own channel. Falls back to #treats if not set yet.
const SUGGESTIONS_CHANNEL_ID = process.env.SUGGESTIONS_CHANNEL_ID || CHANNEL_ID;
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// 1. Connect to Discord
// Intents tell Discord which events to send us.
// Guilds = basics. GuildMembers = see people joining (turn on
// "Server Members Intent" in the Developer Portal, or login fails).
// ---------------------------------------------------------------------------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  if (!process.env.SUGGESTIONS_CHANNEL_ID) {
    console.log('ℹ️  SUGGESTIONS_CHANNEL_ID not set, so polls will go to #treats.');
  }
});

// ---------------------------------------------------------------------------
// 2. How each type of post looks
// ---------------------------------------------------------------------------
const STYLES = {
  treats:  { emoji: '🍪', title: 'Fresh treats',      color: 0xf4a261 },
  special: { emoji: '⭐', title: "Grandma's special", color: 0xe9c46a },
  event:   { emoji: '📅', title: 'Event',             color: 0x8ab6d6 },
  poll:    { emoji: '📊', title: 'Poll',              color: 0xb5838d },
};

const ROLE_PING = () => ({
  content: `<@&${ROLE_ID}>`,               // how you @mention a role
  allowedMentions: { roles: [ROLE_ID] },   // actually lets the ping notify
});

// ---------------------------------------------------------------------------
// 3. The one function that posts. Every ring goes through here,
//    whether it comes from the app or the /ring backup command.
// ---------------------------------------------------------------------------
async function sendRing({ type, text, options, durationHours = 24 }) {
  // Polls: Discord's built-in poll, posted in the suggestions channel.
  // `text` is the question, `options` are the treats from Grandma's library.
  if (type === 'poll') {
    const channel = await client.channels.fetch(SUGGESTIONS_CHANNEL_ID);
    return channel.send({
      ...ROLE_PING(),
      poll: {
        question: { text },
        answers: options.map((o) => ({ text: o })),
        duration: durationHours,
      },
    });
  }

  // Everything else: a styled card in #treats.
  const channel = await client.channels.fetch(CHANNEL_ID);
  const s = STYLES[type];
  const embed = new EmbedBuilder()
    .setColor(s.color)
    .setTitle(`${s.emoji} ${s.title}`)
    .setDescription(text)
    .setFooter({ text: "Rung from Grandma's countertop 🔔" })
    .setTimestamp();

  return channel.send({ ...ROLE_PING(), embeds: [embed] });
}

// Checks a ring before posting. Returns an error message, or null if OK.
// Limits come from Discord: poll question 300 chars, 2–10 answers of 55 chars,
// poll open for 1–768 hours.
function validateRing({ type, text, options, durationHours }) {
  if (!STYLES[type]) return 'type must be one of: treats, special, event, poll';
  if (typeof text !== 'string' || !text.trim()) return 'text is required';
  if (type === 'poll') {
    if (text.length > 300) return 'poll question must be 300 characters or less';
    if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
      return 'polls need 2 to 10 options';
    }
    if (options.some((o) => typeof o !== 'string' || !o.trim() || o.length > 55)) {
      return 'each poll option must be 1 to 55 characters';
    }
    if (
      durationHours !== undefined &&
      (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 768)
    ) {
      return 'durationHours must be a whole number from 1 to 768';
    }
  } else if (text.length > 4000) {
    return 'text must be 4000 characters or less';
  }
  return null;
}

// ---------------------------------------------------------------------------
// 4. Poll results: lets the app find the winning treat
// ---------------------------------------------------------------------------

// Fetches a fresh copy of the poll message (not a cached one, so counts are current).
async function fetchPollMessage(messageId) {
  const channel = await client.channels.fetch(SUGGESTIONS_CHANNEL_ID);
  channel.messages.cache.delete(messageId);
  const message = await channel.messages.fetch(messageId);
  if (!message.poll) throw Object.assign(new Error('That message is not a poll'), { status: 404 });
  return message;
}

// Turns a poll into simple JSON for the app.
function summarizePoll(poll) {
  const answers = poll.answers.map((a) => ({ text: a.text, votes: a.voteCount ?? 0 }));
  const top = Math.max(0, ...answers.map((a) => a.votes));
  const leaders = top > 0 ? answers.filter((a) => a.votes === top).map((a) => a.text) : [];
  const finished = poll.expiresTimestamp !== null && Date.now() >= poll.expiresTimestamp;

  return {
    question: poll.question.text,
    answers,
    totalVotes: answers.reduce((sum, a) => sum + a.votes, 0),
    winner: leaders[0] ?? null,  // null if nobody has voted yet
    tie: leaders.length > 1,     // if true, `leaders` has every tied item
    leaders,
    finished,
    resultsFinal: poll.resultsFinalized,
  };
}

// ---------------------------------------------------------------------------
// 5. Web endpoints the app calls
// ---------------------------------------------------------------------------
const app = express();
app.use(cors()); // lets the browser app call this directly
app.use(express.json());

// Stops a request early if the bot isn't connected to Discord yet.
function requireDiscord(req, res, next) {
  if (!client.isReady()) {
    return res.status(503).json({ ok: false, error: 'Bot is not connected to Discord yet' });
  }
  next();
}

app.get('/health', (req, res) => {
  res.json({ ok: true, discord: client.isReady() });
});

// Ring the bell.
//   { "type": "treats", "text": "Six parfaits left, half price!" }
//   { "type": "poll", "text": "What should Grandma bake next?",
//     "options": ["Maple cookies", "Apple crumble"], "durationHours": 24 }
app.post('/ring', async (req, res) => {
  const error = validateRing(req.body);
  if (error) return res.status(400).json({ ok: false, error });
  if (!client.isReady()) {
    return res.status(503).json({ ok: false, error: 'Bot is not connected to Discord yet' });
  }

  try {
    const msg = await sendRing(req.body);
    console.log(`🔔 Rang "${req.body.type}": ${req.body.text}`);
    res.json({ ok: true, messageId: msg.id, channelId: msg.channelId });
  } catch (err) {
    console.error('Ring failed:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Live results. The app can call this every few seconds to animate vote bars.
app.get('/polls/:messageId', requireDiscord, async (req, res) => {
  try {
    const message = await fetchPollMessage(req.params.messageId);
    res.json({ ok: true, ...summarizePoll(message.poll) });
  } catch (err) {
    console.error('Poll lookup failed:', err.message);
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

// Close the poll now (great for the demo) and return the winner.
app.post('/polls/:messageId/end', requireDiscord, async (req, res) => {
  try {
    let message = await fetchPollMessage(req.params.messageId);
    const alreadyOver =
      message.poll.expiresTimestamp !== null && Date.now() >= message.poll.expiresTimestamp;

    if (!alreadyOver) {
      await message.poll.end();
      message = await fetchPollMessage(req.params.messageId);
      console.log(`🗳️  Closed poll: ${message.poll.question.text}`);
    }
    res.json({ ok: true, ...summarizePoll(message.poll) });
  } catch (err) {
    console.error('Ending poll failed:', err.message);
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔔 Bell listening on http://localhost:${PORT}/ring`);
});

// ---------------------------------------------------------------------------
// 6. Welcome new members and give them the alerts role automatically,
//    so judges get pinged without clicking anything.
//    (The bot's role must be ABOVE "Treat Alerts" in Server Settings → Roles.)
// ---------------------------------------------------------------------------
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    await member.roles.add(ROLE_ID);
    const channel = await client.channels.fetch(CHANNEL_ID);
    await channel.send(
      `Welcome to Grandma's bakery, ${member}! 🍪 You'll get a ping whenever the bell rings.`,
    );
  } catch (err) {
    console.error('Welcome failed:', err.message);
  }
});

// ---------------------------------------------------------------------------
// 7. Backup: /ring slash command, in case the app breaks mid-demo.
//    Register it once with: npm run deploy
// ---------------------------------------------------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'ring') return;

  const ring = {
    type: interaction.options.getString('type'),
    text: interaction.options.getString('text'),
  };
  const error = validateRing(ring);
  if (error) {
    return interaction.reply({ content: `❌ ${error}`, flags: MessageFlags.Ephemeral });
  }

  try {
    await sendRing(ring);
    await interaction.reply({ content: 'Rung! 🔔', flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error('Slash ring failed:', err);
    await interaction.reply({ content: `❌ ${err.message}`, flags: MessageFlags.Ephemeral });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
for (const key of ['DISCORD_TOKEN', 'CHANNEL_ID', 'ROLE_ID']) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in .env`);
    process.exit(1);
  }
}

client.login(DISCORD_TOKEN).catch((err) => {
  console.error(`❌ Discord login failed: ${err.message}`);
  console.error('   Check DISCORD_TOKEN in .env, and that Server Members Intent is on.');
});