# Discord Giveaway Bot

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
</p>

A full-featured TypeScript Discord giveaway bot with support for both slash commands and classic prefix commands.

## Overview

This project is built to run a Discord giveaway bot with:
- flexible duration parsing from seconds to years
- button-based entry and leave actions
- role restrictions
- logging support
- per-server configuration
- announcement and stats utilities

## Features

- Start giveaways with custom titles, winners, roles, and durations
- Duration parsing supports `s`, `m`, `h`, `d`, and `y`
- Optional role requirement before joining
- Join and leave buttons on giveaway embeds
- List active giveaways
- End, cancel, reroll, and stats commands
- Configurable log channel for giveaway events
- Per-server prefix and auto-delete settings
- Works with both slash commands and prefix commands

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root using the example file as a template:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
```

### 3. Run locally

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
6. In OAuth2 > URL Generator, select:
   - `bot`
   - `applications.commands`
7. Invite the bot to your Discord server.

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

## Deployment Notes

- Keep your real Discord token in a local `.env` file only.
- Do not commit secrets to Git.
- The repository is set up to ignore `.env` files by default.
- This project is suitable for running on a local machine, a VPS, or a hosted Node.js environment.

## License

This project is licensed under the MIT License.
