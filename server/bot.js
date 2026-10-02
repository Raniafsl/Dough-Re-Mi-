// PART 4 · The Discord bot. Posts each ring in the campus channel with
// claim (or vote) buttons, and turns every tap into a claim on the hub.

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

// What the student sees (only them) after tapping a button.
export function replyFor(result, name, ring) {
  if (result.ok) {
    if (ring.kind === "poll")
      return `🗳️ Thanks, ${name}! Your vote is in. Grandma will bake the winner.`;
    if (ring.kind === "event")
      return `✅ Seat saved, ${name}! See you at Grandma’s.`;
    const left =
      result.remaining == null
        ? ""
        : result.remaining === 0
          ? " You got the last one!"
          : ` ${result.remaining} left.`;
    return `🧁 Saved one for you, ${name}! Pick it up at the counter and give your name.${left}`;
  }
  return (
    {
      soldout: "😢 Sorry, they’re all claimed. Grandma will ring again soon!",
      already: "You’ve already got this one. 💛",
      gone: "This one has closed. Watch for the next ring!",
      choice: "That option isn’t on the poll.",
    }[result.reason] || "Something went wrong. Please try again."
  );
}

export function buttonsFor(ring, disabled = false) {
  const buttons =
    ring.kind === "poll" && ring.options?.length
      ? ring.options.map((o, i) =>
          new ButtonBuilder()
            .setCustomId(`vote:${ring.id}:${i}`)
            .setLabel((ring.discord.actions[i] || o).slice(0, 80))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        )
      : [
          new ButtonBuilder()
            .setCustomId(`claim:${ring.id}`)
            .setLabel(
              disabled
                ? "All claimed. Thank you!"
                : (ring.discord.actions[0] || "🍪 Claim one").slice(0, 80),
            )
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        ];
  return [new ActionRowBuilder().addComponents(...buttons)];
}

export function startBot({ token, channelId, onClaim, onStatus }) {
  const bot = { ready: false, channelName: null, announce: async () => false };
  if (!token || !channelId) return bot;

  const client = new Client({ intents: [GatewayIntentBits.Guilds] }),
    messages = new Map(), // ringId → the Discord message, to close it when sold out
    pollOptions = new Map(); // ringId → option text; vote buttons carry an index
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
    if (ring.options) pollOptions.set(ring.id, ring.options);
    const embed = new EmbedBuilder()
      .setColor(PINK)
      .setTitle(ring.discord.head || "Grandma’s Bakeria")
      .setDescription(ring.discord.text || ring.text)
      .setFooter({ text: "Grandma’s Bakeria · tap below, no app needed" });
    if (ring.limit)
      embed.addFields({
        name: "How many",
        value: `${ring.limit}, first come first served`,
        inline: true,
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

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    const [action, ringId, index] = interaction.customId.split(":"),
      name =
        interaction.member?.displayName ||
        interaction.user.globalName ||
        interaction.user.username,
      result = onClaim({
        ringId,
        name,
        userId: `discord:${interaction.user.id}`,
        channel: "discord",
        choice:
          action === "vote"
            ? pollOptions.get(ringId)?.[Number(index)]
            : undefined,
      });
    await interaction
      .reply({
        content: replyFor(result, name, result.ring || {}),
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
    // Close the post once the last treat is gone.
    if (
      result.ring &&
      (result.remaining === 0 || result.reason === "soldout")
    ) {
      const msg = messages.get(ringId);
      msg?.edit({ components: buttonsFor(result.ring, true) }).catch(() => {});
    }
  });

  client.login(token).catch((err) => {
    console.error(`Discord login failed: ${err.message}`);
    onStatus();
  });
  return bot;
}
