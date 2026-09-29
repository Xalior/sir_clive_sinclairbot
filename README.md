# 🎩 Sir. Clive Sinclairbot

> 🤖 A Discord channel-manager bot in TypeScript, built from plugins. It has an LLM chatbot, OIDC account linking, a small web UI, an HMAC relay endpoint, and a ZX Spectrum Next soul.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

**📋 [Changelog](docs/changelog.md)** · **🧩 [Plugins](docs/plugins.md)** · **🐳 [Docker](docs/docker.md)** · **🔧 [Env vars](docs/env.txt)**

---

## ✨ Features

- 🔌 **Plugin architecture.** Each plugin gets storage, an Express app and a Discord client. A plugin can declare the env vars it needs, the routes that skip CSRF checks, and the other plugins it requires. → [`docs/plugins.md`](docs/plugins.md)
- 🧠 **LLM chatbot.** Users can reset its context. → [`docs/plugins/chatbot.md`](docs/plugins/chatbot.md)
- 🎩 **Claude chatbot** on the Claude Agent SDK. Each Discord reply chain is one thread, and a reply to an older answer starts a branch. The bot shows its progress as reactions. A channel can accept only users with a linked account. → [`docs/plugins/claudebot.md`](docs/plugins/claudebot.md)
- 👥 **OIDC login and Discord account linking.** The bot sends each user a one-time link by DM. → [`docs/plugins/commands.md`](docs/plugins/commands.md)
- 🛰️ **HMAC relay endpoint.** Services on your LAN can post to Discord without the bot's credentials. → [`docs/plugins/relay.md`](docs/plugins/relay.md)
- 🧱 **Redis storage.** Each plugin has its own namespace, with optional TTL.
- 🎨 **Mustache web UI** for tasks that Discord cannot do.
- 📦 Built with pnpm, tsx, discord.js v14, Express 5 and Zod.

## 🧩 Bundled plugins

| 🔧 | Plugin | What it does | Doc |
|---|---|---|---|
| 💬 | `org.xalior.chatbot` | Mention-driven LLM chat with per-user history | [chatbot](docs/plugins/chatbot.md) |
| 🎩 | `org.xalior.claudebot` | Claude chat, one thread per reply chain, optional linked-account gate | [claudebot](docs/plugins/claudebot.md) |
| 🧰 | `org.xalior.commands` | `!help` / `!ping` / `!uptime` / `!version` / `!register` and the OIDC link flow | [commands](docs/plugins/commands.md) |
| 🏓 | `org.xalior.ping` | Counts pongs per guild. Use it to check that storage works. | [ping](docs/plugins/ping.md) |
| 📖 | `org.xalior.example` | The smallest viable plugin, for copy-paste | [example](docs/plugins/example.md) |
| 📡 | `org.xalior.relay` | Signed HTTP → Discord channel post | [relay](docs/plugins/relay.md) |
| 🍯 | `org.xalior.honeypot` | Trap channel. A user who posts in it is muted at once. | [honeypot](docs/plugins/honeypot.md) |

To add or remove a plugin, edit one line in [`data/plugins.ts`](data/plugins.ts). [`docs/plugins.md`](docs/plugins.md) tells how the loader finds plugins.

## 🚀 Quick start

```bash
git clone https://github.com/Xalior/sir_clive_sinclairbot.git
cd sir_clive_sinclairbot
pnpm install                  # pnpm is enforced via preinstall

cp env.sample .env            # then edit; full list in docs/env.txt
# at minimum set: BOT_TOKEN, OPENAI_TOKEN, CACHE_URL, OIDC_*, HOSTNAME, SESSION_SECRET,
# and ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN for org.xalior.claudebot

pnpm dev                      # hot-reload
pnpm build                    # tsc --noEmit
pnpm start                    # plain run
pnpm test                     # WebdriverIO E2E
```

🐳 **Docker** → [`docs/docker.md`](docs/docker.md). The repo includes a Dockerfile. You write your own `compose.yml` on the host. Git ignores it.

## ⚙️ Configuration

All configuration is in `.env`. The bot validates the required vars at startup. If one is missing, the bot exits with an error.

- 📜 [`docs/env.txt`](docs/env.txt) lists every var with a description.
- 🔌 Each plugin's doc lists its own vars, for example `RELAY_SIGNING_KEY`. Put them in the same `.env`.
- 🔐 [`docs/discord_oauth2_perms.png`](docs/discord_oauth2_perms.png) shows the Discord OAuth2 scopes to turn on.

## 🧪 Testing

```bash
pnpm test       # WebdriverIO
pnpm build      # tsc --noEmit (no unit-test framework yet)
```

## 🐛 Bugs and suggestions

Report crashing bugs, with steps to reproduce, on the [issues page](https://github.com/Xalior/sir_clive_sinclairbot/issues).

## 📜 License

AGPL-3.0. See [LICENSE](LICENSE).

---

<p align="center">Made with ☕, 🕹️, and a deep and abiding love for the ZX Spectrum Next.</p>

<p>The Sir. is short for Circuit.</p>
