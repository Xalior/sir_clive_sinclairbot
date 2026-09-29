# org.xalior.commands

The basic `!` commands. The plugin reads the command at the start of the message and replies in the channel or by DM.

Source: [`plugins/org.xalior.commands/commands.ts`](../../plugins/org.xalior.commands/commands.ts)

## Commands

| Command | Effect |
|---|---|
| `!help` | Sends the user `responses/help.md` by DM, and reacts with `🤖` |
| `!ping` | Replies `pong!` in the channel |
| `!uptime` | Replies with the bot's uptime since process start |
| `!version` | Replies with the package version, homepage URL, and bug-tracker URL |
| `!register` | Sends the user a one-time link by DM, valid for 15 minutes, and reacts with `🔓`. The link opens a confirmation page. The user must be logged in, and must confirm to link their Discord account to their local account. If the user is already linked, the bot sends a DM that says so and reacts with `🔒`. |

## Web routes

The plugin mounts these routes for the `!register` flow. Both need a logged-in user.

| Route | Effect |
|---|---|
| `GET /u/:uuid` | Shows a confirmation page with a form. It changes nothing. |
| `POST /u/:uuid` | CSRF-protected. Attaches the logged-in user's claim to the matching `DiscordAccount`, deletes the verification token, and sends the user a confirmation by DM. |

Both routes return 404 if the verification token does not exist or has expired.

The plugin mounts the routes in its constructor, before `super()`. They depend on the auth module's session and passport middleware. `src/bot.ts` sets up that middleware before `load_plugins()` runs.

## Configuration

The plugin has no env vars of its own. It uses the core `HOSTNAME` in the verification URL.

## Storage

The plugin stores verification tokens in the `Verifications` store from `src/auth.ts`, with a 15-minute TTL. If the user does not use the link in that time, it expires.

When the user confirms the link, the plugin writes to `DiscordAccounts`. This is a core store in `src/discord.ts`, not a store of this plugin. Other plugins read it through the `Plugin` method `getDiscordUser()`.
