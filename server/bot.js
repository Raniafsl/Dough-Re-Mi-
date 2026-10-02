// PART 4 · The Discord bot. Posts each bell ring in the campus channel as a
// broadcast. Polls (from the bell or the monthly check-in) get one button per
// option, and every tap becomes a vote on the hub.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
} from "discord.js";

const PINK = 0xe9b4c7;

// What the voter sees (only them) after tapping a button.
export function replyFor(result, name) {
  if (result.ok)
    return `🗳️ Thanks, ${name}! Your vote is in. Grandma reads every one.`;
  return (
    {
      already: "You’ve already voted on this one. 💛",
      gone: "This poll has closed. Watch for the next one!",
      choice: "That option isn’t on the poll.",
    }[result.reason] || "Something went wrong. Please try again."
  );
}

// Only polls get buttons; everything else is a plain announcement.
export function buttonsFor(ring, disabled = false) {
  if (!ring.options?.length) return [];
  return [
    new ActionRowBuilder().addComponents(
      ...ring.options.slice(0, 5).map((o, i) =>
        new ButtonBuilder()
          .setCustomId(`vote:${ring.id}:${i}`)
          .setLabel((ring.discord?.actions?.[i] || o).slice(0, 80))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled),
      ),
    ),
  ];
}

export function startBot({ token, channelId, onVote, lookupRing, onStatus }) {
  const bot = {
    ready: false,
    channelName: null,
    announce: async () => false,
    postResults: async () => false,
  };
  if (!token || !channelId) return bot;

  const client = new Client({ intents: [GatewayIntentBits.Guilds] }),
    messages = new Map(); // ringId → Discord message, to close a poll's buttons
  let channel = null;

  client.once(Events.ClientReady, async (c) => {
    try {
      channel = await c.channels.fetch(channelId);
      bot.ready = true;
      bot.channelName = channel.name;
      console.log(`🤖 ${c.user.tag} is posting in #${channel.name}`);
    } catch (err) {
      console.error(`Couldn't open channel ${channelId}: ${err.message}`);
    }
    onStatus();
  });

  bot.announce = async (ring) => {
    if (!bot.ready) return false;
    const embed = new EmbedBuilder()
      .setColor(PINK)
      .setTitle(ring.discord?.head || "Grandma’s Bakeria")
      .setDescription(ring.discord?.text || ring.text)
      .setFooter({
        text: ring.options?.length
          ? "Grandma’s Bakeria · tap to vote"
          : "Grandma’s Bakeria · see you at the counter",
      });
    try {
      messages.set(
        ring.id,
        await channel.send({ embeds: [embed], components: buttonsFor(ring) }),
      );
      return true;
    } catch (err) {
      console.error(`Couldn't post the ring: ${err.message}`);
      return false;
    }
  };

  // When a monthly check-in closes: thank everyone and show the tally.
  bot.postResults = async (ring, results) => {
    if (!bot.ready) return false;
    const total = results.reduce((t, [, n]) => t + n, 0) || 1,
      lines = results.map(
        ([o, n], i) =>
          `${i === 0 ? "🏆" : "▫️"} **${o}**: ${n} vote${n === 1 ? "" : "s"} (${Math.round((n / total) * 100)}%)`,
      );
    try {
      await messages.get(ring.id)?.edit({ components: buttonsFor(ring, true) });
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(PINK)
            .setTitle("📊 The neighbours have spoken!")
            .setDescription(`${ring.text}\n\n${lines.join("\n")}`)
            .setFooter({
              text: `Thank you! Grandma will try “${results[0]?.[0]}” first.`,
            }),
        ],
      });
      return true;
    } catch (err) {
      console.error(`Couldn't post the results: ${err.message}`);
      return false;
    }
  };

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith("vote:"))
      return;
    const [, ringId, index] = interaction.customId.split(":"),
      name =
        interaction.member?.displayName ||
        interaction.user.globalName ||
        interaction.user.username,
      result = onVote({
        ringId,
        name,
        userId: `discord:${interaction.user.id}`,
        channel: "discord",
        choice: lookupRing(ringId)?.options?.[Number(index)],
      });
    await interaction
      .reply({ content: replyFor(result, name), flags: MessageFlags.Ephemeral })
      .catch(() => {});
  });

  client.login(token).catch((err) => {
    console.error(`Discord login failed: ${err.message}`);
    onStatus();
  });
  return bot;
}
