# org.xalior.commands

The core slash-command-style handlers. Reads message content, routes the leading `!command` to a switch, replies in-channel or by DM as appropriate.

Source: [`plugins/org.xalior.commands/commands.ts`](../../plugins/org.xalior.commands/commands.ts)

## Commands

| Command | Effect |
|---|---|
| `!help` | DMs the user the contents of `responses/help.md`, reacts with `🤖` |
| `!ping` | Replies `pong!` in-channel |
| `!uptime` | Replies with the bot's uptime since process start |
| `!version` | Replies with the package version, homepage URL, and bug-tracker URL |
| `!register` | Generates a 15-minute one-time link and DMs it to the user. Visiting the link while logged in completes Discord-account-to-local-account linking. If the user is already linked, reacts with `🔒` instead. |

## Web route

The plugin mounts `GET /u/:uuid` (auth-required) for the `!register` flow. The route resolves the verification token from the plugin's Redis store, attaches the authenticated user's claim to the matching `DiscordAccount`, deletes the verification token, and DMs the user a confirmation.

The route is mounted in the constructor before `super()`, following the original plugin pattern. It depends on the auth module's session/passport middleware, which is set up by `src/bot.ts` before `load_plugins()` runs.

## Configuration

No plugin-specific env vars. Uses core `HOSTNAME` for the verification URL.

## Storage

Verification tokens are stored under the plugin's `Verifications` model with a 15-minute TTL. The link expires automatically if not redeemed.

`DiscordAccounts` writes happen on successful redemption — that table is shared with the auth module, not owned by this plugin.
