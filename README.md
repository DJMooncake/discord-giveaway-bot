# Discord Giveaway Bot

A TypeScript Discord giveaway bot with:
- both slash commands and prefix commands
- flexible duration parsing from seconds to years
- optional role restrictions
- log channel support
- active giveaway listing
- join and leave buttons
- end, reroll, cancel, and stats support
- custom per-server prefixes and auto-delete settings

## Requirements

- Node.js 20+
- A Discord bot token
- A Discord application ID

## Install

1. Open a terminal in this folder.
2. Run:
   npm install

## Environment config

Create a `.env` file in the project root with:

DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here

## Discord setup

1. Go to the Discord Developer Portal.
2. Create a new application.
3. Go to Bot and create a bot.
4. Copy the token and paste it into `.env`.
5. Copy the Application ID and paste it into `.env`.
6. In OAuth2 > URL Generator, select:
   - bot
   - applications.commands
7. Copy the generated invite link and add the bot to your server.

Invite URL pattern:
https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&permissions=8&scope=bot%20applications.commands

## Run

npm run dev

## Slash commands

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

## Prefix commands

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

## Duration format

Use values like:
- `30s`
- `45m`
- `2h`
- `1d 4h`
- `1y 2d 3h 4m 5s`

## Notes

- The giveaway embed includes join and leave buttons.
- If a role is set, only users with that role can enter.
- Giveaway events can be logged to a configured log channel.
- The bot supports both slash and prefix methods for convenience.
