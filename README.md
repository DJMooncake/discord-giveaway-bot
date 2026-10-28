# Discord Giveaway Bot

A TypeScript Discord bot for hosting giveaways with both slash commands and classic prefix commands.

## Features

- Start giveaways with a title, duration, and number of winners
- Flexible duration parsing from seconds to years, including values like `30s`, `45m`, `1d 4h`, and `1y 2d 3h 4m 5s`
- Optional role requirement for entry
- Join and leave buttons on giveaway embeds
- Active giveaway listing
- Cancel, cancel-all, end, reroll, and stats commands
- Guild log channel support
- Per-server prefix configuration
- Auto-delete option for ended giveaway messages

## Tech Stack

- Node.js
- TypeScript
- Discord.js v14
- dotenv

## Requirements

- Node.js 20+
- A Discord bot token
- A Discord application ID

## Installation

1. Clone the repo.
2. Open a terminal in the project folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file using `.env.example` as a template and add your Discord credentials.

   ```env
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_application_id_here
   ```

## Running the Bot

```bash
npm run dev
```

For a production build:

```bash
npm run build
npm start
```

## Discord Setup

1. Go to the Discord Developer Portal.
2. Create a new application.
3. Open the Bot section and create a bot.
4. Copy the bot token into `.env`.
5. Copy the Application ID into `.env`.
6. Use the OAuth2 URL Generator and select:
   - `bot`
   - `applications.commands`
7. Invite the bot to your server.

Example invite URL:

```text
https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&permissions=8&scope=bot%20applications.commands
```

## Commands

### Slash commands

- `/giveaway title:"Steam Key" duration:"1d 2h" winners:2`
- `/giveaway title:"Nitro" duration:"45m" winners:1 role:@Members`
- `/giveaway title:"Legendary Drop" duration:"1y 2d 3h 4m 5s" winners:3`
- `/setlogchannel channel:#giveaway-log`
- `/setgiveawayrole role:@VIP`
- `/cleargiveawayrole`
- `/setprefix prefix:!`
- `/setautodelete enabled:true`
- `/listgiveaways`
- `/cancelgiveaway messageid:1234567890`
- `/cancelallgiveaways`
- `/leavegiveaway messageid:1234567890`
- `/whoentered messageid:1234567890`
- `/giveawaystats`
- `/giveawaystats messageid:1234567890`
- `/endgiveaway messageid:1234567890`
- `/rerollgiveaway messageid:1234567890`

### Prefix commands

Default prefix: `!`

- `!giveaway 10m 2 Steam Key`
- `!giveaway 1d 4h 2 Nitro`
- `!setprefix ?`
- `!setautodelete true`
- `!listgiveaways`
- `!cancelgiveaway 1234567890`
- `!cancelallgiveaways`
- `!leavegiveaway 1234567890`
- `!whoentered 1234567890`
- `!giveawaystats`
- `!giveawaystats 1234567890`

## Duration Format

Examples:

- `30s`
- `45m`
- `2h`
- `1d 4h`
- `1y 2d 3h 4m 5s`

## Notes

- The giveaway embeds include join and leave buttons.
- Role restrictions are optional but supported.
- Giveaway events can be logged to a configured channel.
- The bot supports both slash and text commands for compatibility.

## License

This project is provided as-is for personal and server use.
