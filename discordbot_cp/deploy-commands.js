// Registers the /ring backup command in your server.
// Run once (and again whenever you change the command): npm run deploy

import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const ring = new SlashCommandBuilder()
  .setName('ring')
  .setDescription("Ring Grandma's bell (backup)")
  // Only people who can manage the server see it, so judges can't spam it.
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o.setName('type').setDescription('Kind of post').setRequired(true).addChoices(
      { name: 'Treats', value: 'treats' },
      { name: 'Special', value: 'special' },
      { name: 'Event', value: 'event' },
    ),
  )
  .addStringOption((o) => o.setName('text').setDescription('What to say').setRequired(true));

const rest = new REST().setToken(DISCORD_TOKEN);

// Guild (server) commands show up instantly, unlike global ones.
await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
  body: [ring.toJSON()],
});

console.log('✅ Registered /ring');
