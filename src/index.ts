import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  TextChannel,
  ButtonInteraction,
} from 'discord.js';
import * as dotenv from 'dotenv';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
}

const defaultPrefix = '!';
const buttonCooldowns = new Map<string, number>();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

type Giveaway = {
  messageId: string;
  channelId: string;
  guildId: string;
  title: string;
  winners: number;
  endsAt: number;
  hostId: string;
  requiredRoleId?: string;
  participantIds: Set<string>;
  autoDelete: boolean;
};

type GuildSettings = {
  logChannelId?: string;
  requiredRoleId?: string;
  prefix?: string;
  autoDelete?: boolean;
};

const giveaways = new Map<string, Giveaway>();
const guildSettings = new Map<string, GuildSettings>();

const commands = [
  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway')
    .addStringOption((option) =>
      option.setName('title').setDescription('Giveaway title').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('duration').setDescription('Duration like 1y 2d 3h 4m 5s').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('winners').setDescription('How many winners').setRequired(true).setMinValue(1)
    )
    .addRoleOption((option) =>
      option.setName('role').setDescription('Optional role required to enter').setRequired(false)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('setlogchannel')
    .setDescription('Set the channel where giveaway events are logged')
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Channel to log giveaways in').setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('setgiveawayrole')
    .setDescription('Set the default role required to enter giveaways in this server')
    .addRoleOption((option) =>
      option.setName('role').setDescription('Role required to enter giveaways').setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('cleargiveawayrole')
    .setDescription('Remove the default role requirement for giveaways in this server')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('setprefix')
    .setDescription('Set a custom prefix for text commands in this server')
    .addStringOption((option) =>
      option.setName('prefix').setDescription('New prefix (for example ! or ?)').setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('setautodelete')
    .setDescription('Enable or disable automatic message deletion when giveaway ends')
    .addBooleanOption((option) =>
      option.setName('enabled').setDescription('Whether ended giveaways should be auto-deleted').setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('listgiveaways')
    .setDescription('List active giveaways in this server')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('cancelgiveaway')
    .setDescription('Cancel an active giveaway by message ID')
    .addStringOption((option) =>
      option.setName('messageid').setDescription('The giveaway message ID').setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('cancelallgiveaways')
    .setDescription('Cancel every active giveaway in this server')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('leavegiveaway')
    .setDescription('Leave an active giveaway by message ID')
    .addStringOption((option) =>
      option.setName('messageid').setDescription('The giveaway message ID').setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('whoentered')
    .setDescription('List the users in a giveaway by message ID')
    .addStringOption((option) =>
      option.setName('messageid').setDescription('The giveaway message ID').setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('giveawaystats')
    .setDescription('Show giveaway stats for this server')
    .addStringOption((option) =>
      option.setName('messageid').setDescription('Optional giveaway message ID').setRequired(false)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('endgiveaway')
    .setDescription('End an active giveaway by message ID')
    .addStringOption((option) =>
      option.setName('messageid').setDescription('The giveaway message ID').setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('rerollgiveaway')
    .setDescription('Reroll an ended giveaway by message ID')
    .addStringOption((option) =>
      option.setName('messageid').setDescription('The giveaway message ID').setRequired(true)
    )
    .toJSON(),
];

function getGuildSettings(guildId: string): GuildSettings {
  const existing = guildSettings.get(guildId) ?? {};
  guildSettings.set(guildId, existing);
  return existing;
}

function getGuildPrefix(guildId: string): string {
  return getGuildSettings(guildId).prefix ?? defaultPrefix;
}

function parseDuration(raw: string): number | null {
  const matchers = raw.match(/(\d+)\s*([ydhms])/gi);
  if (!matchers || matchers.length === 0) return null;

  let totalMs = 0;

  for (const token of matchers) {
    const match = token.match(/(\d+)\s*([ydhms])/i);
    if (!match) return null;

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'y':
        totalMs += amount * 365 * 24 * 60 * 60 * 1000;
        break;
      case 'd':
        totalMs += amount * 24 * 60 * 60 * 1000;
        break;
      case 'h':
        totalMs += amount * 60 * 60 * 1000;
        break;
      case 'm':
        totalMs += amount * 60 * 1000;
        break;
      case 's':
        totalMs += amount * 1000;
        break;
      default:
        return null;
    }
  }

  return totalMs;
}

function getTimestampFromMs(ms: number): number {
  return Math.floor(ms / 1000);
}

async function resolveGiveawayMessage(guildId: string, channelId: string, messageId: string) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return null;

  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) return null;

  return channel.messages.fetch(messageId).catch(() => null);
}

async function sendLog(guildId: string, embed: EmbedBuilder) {
  const settings = getGuildSettings(guildId);
  if (!settings.logChannelId) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(settings.logChannelId);
  if (!channel || !channel.isTextBased()) return;

  await channel.send({ embeds: [embed] });
}

async function canEnterGiveaway(giveaway: Giveaway, userId: string) {
  if (!giveaway.requiredRoleId) return true;

  const guild = client.guilds.cache.get(giveaway.guildId);
  if (!guild) return false;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return false;

  return member.roles.cache.has(giveaway.requiredRoleId);
}

function pickWinners(entries: string[], count: number) {
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function buildJoinButton(giveawayId: string) {
  return new ButtonBuilder()
    .setCustomId(`giveaway:${giveawayId}`)
    .setLabel('Enter giveaway')
    .setEmoji('🎉')
    .setStyle(ButtonStyle.Primary);
}

function buildLeaveButton(giveawayId: string) {
  return new ButtonBuilder()
    .setCustomId(`leave:${giveawayId}`)
    .setLabel('Leave giveaway')
    .setEmoji('❌')
    .setStyle(ButtonStyle.Secondary);
}

function buildButtons(giveawayId: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(buildJoinButton(giveawayId), buildLeaveButton(giveawayId));
}

function isButtonCoolingDown(userId: string, messageId: string): boolean {
  const key = `${userId}:${messageId}`;
  const now = Date.now();
  const last = buttonCooldowns.get(key) ?? 0;

  if (now - last < 2000) {
    return true;
  }

  buttonCooldowns.set(key, now);
  return false;
}

async function finishGiveaway(giveaway: Giveaway, message: Message) {
  if (giveaway.participantIds.size === 0) {
    const embed = new EmbedBuilder()
      .setTitle('🎉 Giveaway Ended')
      .setDescription('No valid entries were found, so no winner was selected.')
      .setColor('#FF0000');

    await message.reply({ embeds: [embed] });
    giveaways.delete(giveaway.messageId);

    await sendLog(
      giveaway.guildId,
      new EmbedBuilder()
        .setTitle('Giveaway ended')
        .setDescription(`**${giveaway.title}** ended with no valid entries.`)
        .setColor('#FF0000')
    );

    if (giveaway.autoDelete) {
      await message.delete().catch(() => undefined);
    }
    return;
  }

  const winners = pickWinners([...giveaway.participantIds], giveaway.winners);
  const winnerMentions = winners.map((userId) => `<@${userId}>`).join(', ');

  const embed = new EmbedBuilder()
    .setTitle('🎉 Giveaway Ended')
    .setDescription(`Winner(s): ${winnerMentions}`)
    .setColor('#00AA00');

  await message.reply({ embeds: [embed] });
  giveaways.delete(giveaway.messageId);

  await sendLog(
    giveaway.guildId,
    new EmbedBuilder()
      .setTitle('Giveaway ended')
      .setDescription(`**${giveaway.title}** ended. Winner(s): ${winnerMentions}`)
      .setColor('#00AA00')
  );

  if (giveaway.autoDelete) {
    await message.delete().catch(() => undefined);
  }
}

async function showGiveawayStats(guildId: string, messageId?: string) {
  if (messageId) {
    const giveaway = [...giveaways.values()].find((item) => item.messageId === messageId && item.guildId === guildId);
    if (!giveaway) return null;

    return new EmbedBuilder()
      .setTitle(`Giveaway Stats for "${giveaway.title}"`)
      .setDescription(
        `Winners: ${giveaway.winners}\nEnds: <t:${getTimestampFromMs(giveaway.endsAt)}:F>\nParticipants: ${giveaway.participantIds.size}`
      )
      .setColor('#00AA00');
  }

  const activeGiveaways = [...giveaways.values()].filter((item) => item.guildId === guildId);
  if (activeGiveaways.length === 0) return null;

  return new EmbedBuilder()
    .setTitle('Active Giveaway Stats')
    .setDescription(
      activeGiveaways
        .map(
          (giveaway) => `- **${giveaway.title}** | Winners: ${giveaway.winners} | Ends: <t:${getTimestampFromMs(giveaway.endsAt)}:F>`
        )
        .join('\n')
    )
    .setColor('#5865F2');
}

async function startGiveaway(interaction: ChatInputCommandInteraction) {
  const title = interaction.options.getString('title', true);
  const durationText = interaction.options.getString('duration', true);
  const winnerCount = interaction.options.getInteger('winners', true);
  const role = interaction.options.getRole('role');

  const defaultSettings = getGuildSettings(interaction.guildId ?? '');
  const requiredRoleId = role?.id ?? defaultSettings.requiredRoleId;
  const autoDelete = defaultSettings.autoDelete ?? false;

  const channel = interaction.channel;
  if (!channel || !channel.isTextBased()) {
    await interaction.reply({ content: 'This command must be used in a text channel.', ephemeral: true });
    return;
  }

  if (channel.isDMBased() || channel.isThread()) {
    await interaction.reply({ content: 'This command must be used in a regular text channel.', ephemeral: true });
    return;
  }

  const durationMs = parseDuration(durationText);
  if (!durationMs || durationMs <= 0) {
    await interaction.reply({
      content: 'Invalid duration format. Examples: `45m`, `1d 2h`, `1y 2d 3h 4m 5s`.',
      ephemeral: true,
    });
    return;
  }

  const endTime = Date.now() + durationMs;
  const description = `React or click a button to enter!\nEnds: <t:${getTimestampFromMs(endTime)}:F>\nWinners: ${winnerCount}${requiredRoleId ? `\nRequired role: <@&${requiredRoleId}>` : ''}`;

  const embed = new EmbedBuilder()
    .setTitle(`🎉 ${title}`)
    .setDescription(description)
    .setColor('#FFD700');

  const textChannel = channel as TextChannel;
  const giveawayMessage = await textChannel.send({
    embeds: [embed],
    components: [buildButtons('temp')],
  });

  const realButtons = buildButtons(giveawayMessage.id);
  await giveawayMessage.edit({ components: [realButtons] });

  const giveaway: Giveaway = {
    messageId: giveawayMessage.id,
    channelId: textChannel.id,
    guildId: interaction.guildId ?? '',
    title,
    winners: winnerCount,
    endsAt: endTime,
    hostId: interaction.user.id,
    requiredRoleId,
    participantIds: new Set<string>(),
    autoDelete,
  };

  giveaways.set(giveawayMessage.id, giveaway);

  const timer = setInterval(async () => {
    const current = giveaways.get(giveawayMessage.id);
    if (!current) {
      clearInterval(timer);
      return;
    }

    if (Date.now() >= current.endsAt) {
      clearInterval(timer);
      const message = await resolveGiveawayMessage(current.guildId, current.channelId, current.messageId);
      if (message) {
        await finishGiveaway(current, message);
      }
      giveaways.delete(giveawayMessage.id);
    }
  }, 1000);

  await interaction.reply({ content: 'Giveaway started!', ephemeral: true });

  await sendLog(
    interaction.guildId ?? '',
    new EmbedBuilder()
      .setTitle('Giveaway started')
      .setDescription(
        `**${title}** in <#${textChannel.id}> | Winners: ${winnerCount} | Duration: ${durationText}${requiredRoleId ? ` | Required role: <@&${requiredRoleId}>` : ''}`
      )
      .setColor('#FFD700')
  );
}

async function setLogChannel(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  const channel = interaction.options.getChannel('channel');
  if (!channel) {
    await interaction.reply({ content: 'The channel option is required.', ephemeral: true });
    return;
  }

  const settings = getGuildSettings(interaction.guildId);
  settings.logChannelId = channel.id;

  await interaction.reply({ content: `Giveaway log channel set to <#${channel.id}>.`, ephemeral: true });
}

async function setGiveawayRole(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  const role = interaction.options.getRole('role');
  if (!role) {
    await interaction.reply({ content: 'The role option is required.', ephemeral: true });
    return;
  }

  const settings = getGuildSettings(interaction.guildId);
  settings.requiredRoleId = role.id;

  await interaction.reply({ content: `Default giveaway role set to <@&${role.id}>.`, ephemeral: true });
}

async function clearGiveawayRole(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  const settings = getGuildSettings(interaction.guildId);
  delete settings.requiredRoleId;

  await interaction.reply({ content: 'Default giveaway role restriction cleared.', ephemeral: true });
}

async function setGuildPrefix(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  const prefixInput = interaction.options.getString('prefix', true).trim();
  if (!prefixInput || prefixInput.length > 3) {
    await interaction.reply({ content: 'Prefix must be 1 to 3 characters long.', ephemeral: true });
    return;
  }

  const settings = getGuildSettings(interaction.guildId);
  settings.prefix = prefixInput;

  await interaction.reply({ content: `This server's prefix is now \`${prefixInput}\`.` , ephemeral: true });
}

async function setAutoDelete(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  const enabled = interaction.options.getBoolean('enabled', true);
  const settings = getGuildSettings(interaction.guildId);
  settings.autoDelete = enabled;

  await interaction.reply({ content: `Auto-delete for ended giveaways is now ${enabled ? 'enabled' : 'disabled'}.`, ephemeral: true });
}

async function listGiveaways(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  const activeGiveaways = [...giveaways.values()].filter((item) => item.guildId === interaction.guildId);
  if (activeGiveaways.length === 0) {
    await interaction.reply({ content: 'There are no active giveaways in this server.', ephemeral: true });
    return;
  }

  const lines = activeGiveaways.map((giveaway) => {
    const roleText = giveaway.requiredRoleId ? ` | Role: <@&${giveaway.requiredRoleId}>` : '';
    return `- **${giveaway.title}** | Winners: ${giveaway.winners} | Ends: <t:${getTimestampFromMs(giveaway.endsAt)}:F> | Message: ${giveaway.messageId}${roleText}`;
  });

  const embed = new EmbedBuilder()
    .setTitle('Active giveaways')
    .setDescription(lines.join('\n'))
    .setColor('#5865F2');

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function cancelGiveaway(interaction: ChatInputCommandInteraction) {
  const messageId = interaction.options.getString('messageid', true);
  const giveaway = [...giveaways.values()].find((item) => item.messageId === messageId && item.guildId === interaction.guildId);

  if (!giveaway) {
    await interaction.reply({ content: 'No active giveaway found with that message ID.', ephemeral: true });
    return;
  }

  const message = await resolveGiveawayMessage(giveaway.guildId, giveaway.channelId, giveaway.messageId);
  if (message) {
    await message.reply({ content: `This giveaway was cancelled by <@${interaction.user.id}>.` });
  }

  giveaways.delete(giveaway.messageId);
  await interaction.reply({ content: 'Giveaway cancelled.', ephemeral: true });
}

async function cancelAllGiveaways(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    return;
  }

  const activeGiveaways = [...giveaways.values()].filter((item) => item.guildId === interaction.guildId);
  if (activeGiveaways.length === 0) {
    await interaction.reply({ content: 'There are no active giveaways in this server.', ephemeral: true });
    return;
  }

  for (const giveaway of activeGiveaways) {
    const message = await resolveGiveawayMessage(giveaway.guildId, giveaway.channelId, giveaway.messageId);
    if (message) {
      await message.reply({ content: `This giveaway was cancelled by <@${interaction.user.id}>.` });
    }
    giveaways.delete(giveaway.messageId);
  }

  await interaction.reply({ content: `Cancelled ${activeGiveaways.length} giveaway(s).`, ephemeral: true });
}

async function leaveGiveaway(interaction: ChatInputCommandInteraction) {
  const messageId = interaction.options.getString('messageid', true);
  const giveaway = [...giveaways.values()].find((item) => item.messageId === messageId && item.guildId === interaction.guildId);

  if (!giveaway) {
    await interaction.reply({ content: 'No active giveaway found with that message ID.', ephemeral: true });
    return;
  }

  if (!giveaway.participantIds.has(interaction.user.id)) {
    await interaction.reply({ content: 'You are not a participant in this giveaway.', ephemeral: true });
    return;
  }

  giveaway.participantIds.delete(interaction.user.id);
  await interaction.reply({ content: 'You left the giveaway.', ephemeral: true });
}

async function whoEntered(interaction: ChatInputCommandInteraction) {
  const messageId = interaction.options.getString('messageid', true);
  const giveaway = [...giveaways.values()].find((item) => item.messageId === messageId && item.guildId === interaction.guildId);

  if (!giveaway) {
    await interaction.reply({ content: 'No active giveaway found with that message ID.', ephemeral: true });
    return;
  }

  const members = [...giveaway.participantIds].map((id) => `<@${id}>`);
  const description = members.length > 0 ? members.join(', ') : 'No one has entered yet.';

  const embed = new EmbedBuilder()
    .setTitle(`Entries for "${giveaway.title}"`)
    .setDescription(description)
    .setColor('#5865F2');

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function endGiveaway(interaction: ChatInputCommandInteraction) {
  const messageId = interaction.options.getString('messageid', true);
  const giveaway = [...giveaways.values()].find((item) => item.messageId === messageId && item.guildId === interaction.guildId);

  if (!giveaway) {
    await interaction.reply({ content: 'No active giveaway was found with that message ID.', ephemeral: true });
    return;
  }

  const message = await resolveGiveawayMessage(giveaway.guildId, giveaway.channelId, giveaway.messageId);
  if (!message) {
    await interaction.reply({ content: 'Could not find the giveaway message.', ephemeral: true });
    return;
  }

  await finishGiveaway(giveaway, message);
  await interaction.reply({ content: 'Giveaway ended.', ephemeral: true });
}

async function rerollGiveaway(interaction: ChatInputCommandInteraction) {
  const messageId = interaction.options.getString('messageid', true);
  const giveaway = [...giveaways.values()].find((item) => item.messageId === messageId && item.guildId === interaction.guildId);

  if (giveaway) {
    const message = await resolveGiveawayMessage(giveaway.guildId, giveaway.channelId, giveaway.messageId);
    if (!message) {
      await interaction.reply({ content: 'Could not find the giveaway message.', ephemeral: true });
      return;
    }

    if (giveaway.participantIds.size === 0) {
      await interaction.reply({ content: 'No participants were found for this giveaway.', ephemeral: true });
      return;
    }

    const winner = pickWinners([...giveaway.participantIds], 1)[0];
    await interaction.reply({ content: `Reroll winner: ${winner ? `<@${winner}>` : 'No winner'}` });
    return;
  }

  const endedMessage = await resolveGiveawayMessage(interaction.guildId ?? '', interaction.channelId, messageId);
  if (!endedMessage) {
    await interaction.reply({ content: 'No giveaway found with that message ID.', ephemeral: true });
    return;
  }

  const reaction = endedMessage.reactions.cache.get('🎉');
  if (!reaction) {
    await interaction.reply({ content: 'No giveaway participants were found.', ephemeral: true });
    return;
  }

  const users = await reaction.users.fetch();
  const participantIds = [...users.values()].filter((user) => !user.bot).map((user) => user.id);

  if (participantIds.length === 0) {
    await interaction.reply({ content: 'No participants were found for this giveaway.', ephemeral: true });
    return;
  }

  const winner = pickWinners(participantIds, 1)[0];
  await interaction.reply({ content: `Reroll winner: ${winner ? `<@${winner}>` : 'No winner'}` });
}

async function handlePrefixGiveaway(message: Message) {
  if (message.author.bot || !message.guildId) return;

  const guildPrefix = getGuildPrefix(message.guildId);
  if (!message.content.startsWith(guildPrefix)) return;

  const args = message.content.slice(guildPrefix.length).trim().split(/\s+/);
  const command = args[0]?.toLowerCase();
  if (!command) return;

  if (command === 'giveaway') {
    const title = args.slice(3).join(' ');
    const durationText = args[1];
    const winnerCount = Number(args[2]);

    if (!durationText || !Number.isFinite(winnerCount) || winnerCount < 1 || !title) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('Usage: `!giveaway 10m 2 Steam Key`');
      }
      return;
    }

    const durationMs = parseDuration(durationText);
    if (!durationMs || durationMs <= 0) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('Invalid duration format. Examples: `45m`, `1d 2h`, `1y 2d 3h 4m 5s`.');
      }
      return;
    }

    const channel = message.channel;
    if (!channel || !channel.isTextBased() || channel.isDMBased() || channel.isThread()) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('This command must be used in a regular text channel.');
      }
      return;
    }

    const defaultSettings = getGuildSettings(message.guildId);
    const endTime = Date.now() + durationMs;
    const description = `React or click a button to enter!\nEnds: <t:${getTimestampFromMs(endTime)}:F>\nWinners: ${winnerCount}${defaultSettings.requiredRoleId ? `\nRequired role: <@&${defaultSettings.requiredRoleId}>` : ''}`;

    const embed = new EmbedBuilder()
      .setTitle(`🎉 ${title}`)
      .setDescription(description)
      .setColor('#FFD700');

    const giveawayMessage = await (channel as TextChannel).send({
      embeds: [embed],
      components: [buildButtons('temp')],
    });

    const realButtons = buildButtons(giveawayMessage.id);
    await giveawayMessage.edit({ components: [realButtons] });

    const giveaway: Giveaway = {
      messageId: giveawayMessage.id,
      channelId: (channel as TextChannel).id,
      guildId: message.guildId,
      title,
      winners: winnerCount,
      endsAt: endTime,
      hostId: message.author.id,
      requiredRoleId: defaultSettings.requiredRoleId,
      participantIds: new Set<string>(),
      autoDelete: defaultSettings.autoDelete ?? false,
    };

    giveaways.set(giveawayMessage.id, giveaway);

    const timer = setInterval(async () => {
      const current = giveaways.get(giveawayMessage.id);
      if (!current) {
        clearInterval(timer);
        return;
      }

      if (Date.now() >= current.endsAt) {
        clearInterval(timer);
        const msg = await resolveGiveawayMessage(current.guildId, current.channelId, current.messageId);
        if (msg) {
          await finishGiveaway(current, msg);
        }
        giveaways.delete(giveawayMessage.id);
      }
    }, 1000);

    await message.reply('Giveaway started!');
    return;
  }

  if (command === 'cancelgiveaway') {
    const messageId = args[1];
    if (!messageId) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('Usage: `!cancelgiveaway MESSAGE_ID`');
      }
      return;
    }

    const giveaway = [...giveaways.values()].find((item) => item.messageId === messageId && item.guildId === message.guildId);
    if (!giveaway) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('No active giveaway found with that message ID.');
      }
      return;
    }

    const msg = await resolveGiveawayMessage(giveaway.guildId, giveaway.channelId, giveaway.messageId);
    if (msg) {
      await msg.reply({ content: `This giveaway was cancelled by <@${message.author.id}>.` });
    }

    giveaways.delete(giveaway.messageId);
    if (message.channel.isTextBased() && !message.channel.isDMBased() && !message.channel.isThread()) {
      await message.channel.send('Giveaway cancelled.');
    }
    return;
  }

  if (command === 'cancelallgiveaways') {
    const activeGiveaways = [...giveaways.values()].filter((item) => item.guildId === message.guildId);
    if (activeGiveaways.length === 0) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('There are no active giveaways in this server.');
      }
      return;
    }

    for (const giveaway of activeGiveaways) {
      const msg = await resolveGiveawayMessage(giveaway.guildId, giveaway.channelId, giveaway.messageId);
      if (msg) {
        await msg.reply({ content: `This giveaway was cancelled by <@${message.author.id}>.` });
      }
      giveaways.delete(giveaway.messageId);
    }

    if (message.channel.isTextBased() && !message.channel.isDMBased() && !message.channel.isThread()) {
      await message.channel.send(`Cancelled ${activeGiveaways.length} giveaway(s).`);
    }
    return;
  }

  if (command === 'listgiveaways') {
    const activeGiveaways = [...giveaways.values()].filter((item) => item.guildId === message.guildId);
    if (activeGiveaways.length === 0) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('There are no active giveaways in this server.');
      }
      return;
    }

    const lines = activeGiveaways.map(
      (giveaway) => `- **${giveaway.title}** | Winners: ${giveaway.winners} | Ends: <t:${getTimestampFromMs(giveaway.endsAt)}:F>`
    );

    if (message.channel.isTextBased() && !message.channel.isDMBased() && !message.channel.isThread()) {
      await message.channel.send({
        embeds: [new EmbedBuilder().setTitle('Active giveaways').setDescription(lines.join('\n')).setColor('#5865F2')],
      });
    }
    return;
  }

  if (command === 'leavegiveaway') {
    const messageId = args[1];
    if (!messageId) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('Usage: `!leavegiveaway MESSAGE_ID`');
      }
      return;
    }

    const giveaway = [...giveaways.values()].find((item) => item.messageId === messageId && item.guildId === message.guildId);
    if (!giveaway) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('No active giveaway found with that message ID.');
      }
      return;
    }

    if (!giveaway.participantIds.has(message.author.id)) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('You are not a participant in this giveaway.');
      }
      return;
    }

    giveaway.participantIds.delete(message.author.id);
    if (message.channel.isTextBased() && !message.channel.isDMBased()) {
      await message.channel.send('You have left the giveaway.');
    }
    return;
  }

  if (command === 'giveawaystats') {
    const messageId = args[1];
    const embed = await showGiveawayStats(message.guildId, messageId);

    if (!embed) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('There are no active giveaways in this server.');
      }
      return;
    }

    if (message.channel.isTextBased() && !message.channel.isDMBased() && !message.channel.isThread()) {
      await message.channel.send({ embeds: [embed] });
    }
    return;
  }

  if (command === 'whoentered') {
    const messageId = args[1];
    if (!messageId) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('Usage: `!whoentered MESSAGE_ID`');
      }
      return;
    }

    const giveaway = [...giveaways.values()].find((item) => item.messageId === messageId && item.guildId === message.guildId);
    if (!giveaway) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('No active giveaway found with that message ID.');
      }
      return;
    }

    const users = [...giveaway.participantIds].map((id) => `<@${id}>`);
    const description = users.length > 0 ? users.join(', ') : 'No one has entered yet.';

    if (message.channel.isTextBased() && !message.channel.isDMBased() && !message.channel.isThread()) {
      await message.channel.send({
        embeds: [new EmbedBuilder().setTitle(`Entries for "${giveaway.title}"`).setDescription(description).setColor('#5865F2')],
      });
    }
    return;
  }

  if (command === 'setprefix') {
    const newPrefix = args[1];
    if (!newPrefix || newPrefix.length > 3) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('Prefix must be 1 to 3 characters long.');
      }
      return;
    }

    const settings = getGuildSettings(message.guildId);
    settings.prefix = newPrefix;
    if (message.channel.isTextBased() && !message.channel.isDMBased()) {
      await message.channel.send(`This server's prefix is now \`${newPrefix}\`.`);
    }
    return;
  }

  if (command === 'setautodelete') {
    const value = args[1]?.toLowerCase();
    if (!value || !['true', 'false'].includes(value)) {
      if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        await message.channel.send('Usage: `!setautodelete true` or `!setautodelete false`');
      }
      return;
    }

    const settings = getGuildSettings(message.guildId);
    settings.autoDelete = value === 'true';
    if (message.channel.isTextBased() && !message.channel.isDMBased()) {
      await message.channel.send(`Auto-delete for ended giveaways is now ${settings.autoDelete ? 'enabled' : 'disabled'}.`);
    }
    return;
  }
}

async function handleButtonInteraction(interaction: ButtonInteraction) {
  const [type, messageId] = interaction.customId.split(':');
  if (!messageId) return;

  const giveaway = giveaways.get(messageId);
  if (!giveaway) {
    await interaction.reply({ content: 'This giveaway is no longer active.', ephemeral: true });
    return;
  }

  if (interaction.guildId !== giveaway.guildId) {
    await interaction.reply({ content: 'This giveaway is not in this server.', ephemeral: true });
    return;
  }

  if (isButtonCoolingDown(interaction.user.id, messageId)) {
    await interaction.reply({ content: 'Please wait a couple seconds before clicking again.', ephemeral: true });
    return;
  }

  if (type === 'giveaway') {
    if (giveaway.participantIds.has(interaction.user.id)) {
      await interaction.reply({ content: 'You already entered this giveaway.', ephemeral: true });
      return;
    }

    const canJoin = await canEnterGiveaway(giveaway, interaction.user.id);
    if (!canJoin) {
      await interaction.reply({ content: 'You do not have the required role to enter this giveaway.', ephemeral: true });
      return;
    }

    giveaway.participantIds.add(interaction.user.id);
    await interaction.reply({ content: 'You entered the giveaway!', ephemeral: true });
    return;
  }

  if (type === 'leave') {
    if (!giveaway.participantIds.has(interaction.user.id)) {
      await interaction.reply({ content: 'You are not in this giveaway.', ephemeral: true });
      return;
    }

    giveaway.participantIds.delete(interaction.user.id);
    await interaction.reply({ content: 'You left the giveaway.', ephemeral: true });
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log('Slash commands registered');
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  switch (interaction.commandName) {
    case 'giveaway':
      await startGiveaway(interaction);
      break;
    case 'setlogchannel':
      await setLogChannel(interaction);
      break;
    case 'setgiveawayrole':
      await setGiveawayRole(interaction);
      break;
    case 'cleargiveawayrole':
      await clearGiveawayRole(interaction);
      break;
    case 'setprefix':
      await setGuildPrefix(interaction);
      break;
    case 'setautodelete':
      await setAutoDelete(interaction);
      break;
    case 'listgiveaways':
      await listGiveaways(interaction);
      break;
    case 'cancelgiveaway':
      await cancelGiveaway(interaction);
      break;
    case 'cancelallgiveaways':
      await cancelAllGiveaways(interaction);
      break;
    case 'leavegiveaway':
      await leaveGiveaway(interaction);
      break;
    case 'whoentered':
      await whoEntered(interaction);
      break;
    case 'giveawaystats':
      {
        const messageId = interaction.options.getString('messageid');
        const embed = await showGiveawayStats(interaction.guildId ?? '', messageId ?? undefined);
        if (!embed) {
          await interaction.reply({ content: 'There are no active giveaways in this server.', ephemeral: true });
          return;
        }
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
      break;
    case 'endgiveaway':
      await endGiveaway(interaction);
      break;
    case 'rerollgiveaway':
      await rerollGiveaway(interaction);
      break;
    default:
      break;
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content.startsWith(getGuildPrefix(message.guildId ?? ''))) {
    await handlePrefixGiveaway(message);
  }
});

client.login(token);
