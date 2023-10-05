import { dirname, importx } from '@discordx/importer';
import type { Interaction, Message } from 'discord.js';
import { IntentsBitField, Partials } from 'discord.js';
import { Client } from 'discordx';
import { cookVoteKey, sanity } from './lib/sanity';

export const bot = new Client({
  // Discord intents
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
  ],

  // Partials: all three need to be on in order to receive up-to-date reaction events
  partials: [
      Partials.Message,
      Partials.Channel,
      Partials.Reaction,
  ],

  // Debug logs are disabled in silent mode
  silent: false,
});

bot.once('ready', async () => {
  // Make sure all guilds are cached
  // await bot.guilds.fetch();

  console.log('Bubble started 🫧');
});

bot.on('interactionCreate', (interaction: Interaction) => {
  bot.executeInteraction(interaction);
});

async function run() {
  // The following syntax should be used in the commonjs environment
  //
  // await importx(__dirname + '/{events,commands}/**/*.{ts,js}');

  // The following syntax should be used in the ECMAScript environment
  await importx(`${dirname(import.meta.url)}/{events,commands}/**/*.{ts,js}`);

  // Let's start the bot
  if (!process.env.BOT_TOKEN) {
    throw Error('Could not find BOT_TOKEN in your environment');
  }

  // Log in with your bot token
  await bot.login(process.env.BOT_TOKEN);
}

run();
