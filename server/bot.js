// PART 4 · The Discord bot. Posts each bell ring in the campus channel as a
// broadcast. Polls (from the bell or the monthly check-in) get one button per
// option, and every tap becomes a vote on the hub.
//
// Optional extras, each on only when its setting is in server/.env:
//   DISCORD_ROLE_ID                 ping that role on every post; give it to
//                                   new members with a welcome
//   DISCORD_SUGGESTIONS_CHANNEL_ID  polls and the monthly check-in go there
//   DISCORD_GUILD_ID                a /ring command, a backup for the bell

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

const PINK = 0xe9b4c7;

// /ring headings: the same as the bell's picture buttons (hub.js).
const RING_HEADS = {
  treats: "🍪 Leftover treats, rescued!",
  special: "⭐ This week’s special",
  event: "🎉 You’re invited",
};
const ringCommand = new SlashCommandBuilder()
  .setName("ring")
  .setDescription("Ring Grandma’s bell (backup for the Countertop)")
  // Only people who can manage the server see it, so judges can't spam it.
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o
      .setName("type")
      .setDescription("Kind of post")
      .setRequired(true)
      .addChoices(
        { name: "Treats", value: "treats" },
        { name: "Special", value: "special" },
        { name: "Event", value: "event" },
      ),
  )
  .addStringOption((o) =>
    o
      .setName("text")
      .setDescription("What to say")
      .setRequired(true)
      .setMaxLength(300),
  );

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

export function startBot({
  token,
  channelId,
  suggestionsChannelId,
  roleId,
  guildId,
  onVote,
  onRing,
  lookupRing,
  onStatus,
}) {
  const bot = {
    ready: false,
    channelName: null,
    announce: async () => false,
    postResults: async () => false,
  };
  if (!token || !channelId) return bot;

  const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        // Seeing people join is a privileged intent: only ask when it's used.
        ...(roleId ? [GatewayIntentBits.GuildMembers] : []),
      ],
    }),
    messages = new Map(); // ringId → Discord message, to close a poll's buttons
  let channel = null,
    suggestions = null; // where polls go: #suggestions, or the main channel

  // A role mention in the message text (not the embed) makes phones buzz.
  const ping = () =>
    roleId
      ? { content: `<@&${roleId}>`, allowedMentions: { roles: [roleId] } }
      : {};
  const channelFor = (ring) => (ring.options?.length ? suggestions : channel);

  client.once(Events.ClientReady, async (c) => {
    try {
      channel = suggestions = await c.channels.fetch(channelId);
      if (suggestionsChannelId)
        suggestions = await c.channels
          .fetch(suggestionsChannelId)
          .catch((err) => {
            console.error(
              `Couldn't open the suggestions channel ${suggestionsChannelId}: ${err.message}. Polls will go to #${channel.name}.`,
            );
            return channel;
          });
      bot.ready = true;
      bot.channelName = channel.name;
      console.log(`🤖 ${c.user.tag} is posting in #${channel.name}`);
      if (suggestions !== channel)
        console.log(`🗳️ Polls and the monthly check-in go to #${suggestions.name}`);
    } catch (err) {
      console.error(`Couldn't open channel ${channelId}: ${err.message}`);
    }
    onStatus();
    if (!bot.ready) return;
    if (roleId) await checkRole();
    if (guildId && onRing) await registerRing(c);
  });

  // Warn at startup if the alerts role can't do its job.
  async function checkRole() {
    try {
      const guild = channel.guild,
        role = await guild.roles.fetch(roleId);
      if (!role)
        return console.error(
          `DISCORD_ROLE_ID ${roleId} isn't a role in ${guild.name}, so posts won't ping anyone.`,
        );
      await guild.members.fetchMe();
      console.log(`🔔 Pinging @${role.name} on every post`);
      if (!role.editable)
        console.error(
          `⚠️ I can't give new members @${role.name}: give my role the Manage Roles permission and drag it above @${role.name} in Server Settings → Roles.`,
        );
    } catch (err) {
      console.error(`Couldn't check the alerts role ${roleId}: ${err.message}`);
    }
  }

  // /ring is registered on every start. `set` replaces this bot's commands
  // in that server, so doing it again is harmless.
  async function registerRing(c) {
    try {
      await c.application.commands.set([ringCommand], guildId);
      console.log("⌨️ /ring is ready (members with Manage Server only)");
    } catch (err) {
      console.error(
        `Couldn't add /ring to server ${guildId}: ${err.message}. Check DISCORD_GUILD_ID, and that the bot was invited with the applications.commands scope.`,
      );
    }
  }

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
        await channelFor(ring).send({
          ...ping(),
          embeds: [embed],
          components: buttonsFor(ring),
        }),
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
      // Results go where the poll is.
      const poll = messages.get(ring.id);
      await poll?.edit({ components: buttonsFor(ring, true) });
      await (poll?.channel || channelFor(ring)).send({
        ...ping(),
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

  // /ring: the same path as POST /api/rings, so it's saved and on the Countertop.
  if (guildId && onRing)
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand() || interaction.commandName !== "ring")
        return;
      const kind = interaction.options.getString("type"),
        text = interaction.options.getString("text");
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const [status, data] = await onRing({
          id: `discord-${interaction.id}`,
          kind,
          text,
          discord: { head: RING_HEADS[kind], text, actions: [] },
        });
        await interaction.editReply(
          status !== 201
            ? `❌ Couldn’t ring: ${data.error}`
            : data.discord
              ? "🔔 Rung! It’s in the channel and on the Countertop."
              : "Saved on the Countertop, but I couldn’t post it here. Check the server log.",
        );
      } catch (err) {
        console.error(`/ring failed: ${err.message}`);
        await interaction
          .editReply("❌ Something went wrong. Check the server log.")
          .catch(() => {});
      }
    });

  // New members get the alerts role (so the bell reaches them) and a hello.
  if (roleId)
    client.on(Events.GuildMemberAdd, async (member) => {
      if (member.user.bot || member.guild.id !== channel?.guildId) return;
      const gotRole = await member.roles.add(roleId).then(
        () => true,
        (err) => {
          console.error(
            `Couldn't give ${member.user.tag} the alerts role: ${err.message}. Give my role the Manage Roles permission and drag it above the alerts role in Server Settings → Roles.`,
          );
          return false;
        },
      );
      await channel
        .send(
          `Welcome to Grandma’s Bakeria, ${member}! 🍪${gotRole ? " You’ll get a ping whenever the bell rings." : ""}`,
        )
        .catch((err) => console.error(`Couldn't post the welcome: ${err.message}`));
    });

  client.login(token).catch((err) => {
    console.error(`Discord login failed: ${err.message}`);
    if (err.code === "DisallowedIntents" || /intent/i.test(err.message))
      console.error(
        "DISCORD_ROLE_ID needs Server Members Intent: turn it on at https://discord.com/developers/applications → your app → Bot → Privileged Gateway Intents, then restart. (Or empty DISCORD_ROLE_ID to run without welcomes.)",
      );
    onStatus();
  });
  return bot;
}
