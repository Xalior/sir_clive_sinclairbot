# 🎩 Sir. Clive Sinclairbot

> 🤖 A plugin-powered Discord channel-manager bot, written in TypeScript — with an LLM chatbot brain, OIDC account linking, a tiny web UI, an HMAC relay endpoint, and a ZX Spectrum Next soul.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

**📋 [Changelog](docs/changelog.md)** · **🧩 [Plugins](docs/plugins.md)** · **🐳 [Docker](docs/docker.md)** · **🔧 [Env vars](docs/env.txt)**

---

## ✨ What's in the box

- 🔌 **Drop-in plugin architecture** — each plugin gets storage, an Express app, a Discord client, and clean extension points for env vars and CSRF allowlists. → [`docs/plugins.md`](docs/plugins.md)
- 🧠 **LLM chatbot** with resettable context. → [`docs/plugins/chatbot.md`](docs/plugins/chatbot.md)
- 👥 **OIDC login + Discord-account linking** through a per-user one-time DM link. → [`docs/plugins/commands.md`](docs/plugins/commands.md)
- 🛰️ **HMAC relay endpoint** so LAN services can post into Discord without holding bot creds. → [`docs/plugins/relay.md`](docs/plugins/relay.md)
- 🧱 **Redis-backed storage** namespaced per plugin, with optional TTL.
- 🎨 **Mustache web UI** for the things Discord can't do.
- 📦 **pnpm**, **tsx**, **discord.js v14**, **Express 5**, **Zod**.

## 🧩 Bundled plugins

| 🔧 | Plugin | What it does | Doc |
|---|---|---|---|
| 💬 | `org.xalior.chatbot` | Mention-driven LLM chat with per-user history | [chatbot](docs/plugins/chatbot.md) |
| 🧰 | `org.xalior.commands` | `!help` / `!ping` / `!uptime` / `!version` / `!register` and the OIDC link flow | [commands](docs/plugins/commands.md) |
| 🏓 | `org.xalior.ping` | Counts pongs per guild — useful smoke for "is storage alive" | [ping](docs/plugins/ping.md) |
| 📖 | `org.xalior.example` | The smallest viable plugin, for copy-paste | [example](docs/plugins/example.md) |
| 📡 | `org.xalior.relay` | Signed HTTP → Discord channel post | [relay](docs/plugins/relay.md) |

Adding or removing a plugin is one line in [`data/plugins.ts`](data/plugins.ts) — see [`docs/plugins.md`](docs/plugins.md) for how the loader picks them up.

## 🚀 Quick start

```bash
git clone https://github.com/Xalior/sir_clive_sinclairbot.git
cd sir_clive_sinclairbot
pnpm install                  # pnpm is enforced via preinstall

cp env.sample .env            # then edit; full list in docs/env.txt
# at minimum set: BOT_TOKEN, OPENAI_TOKEN, CACHE_URL, OIDC_*, HOSTNAME

pnpm dev                      # hot-reload
pnpm build                    # tsc --noEmit
pnpm start                    # plain run
pnpm test                     # WebdriverIO E2E
```

🐳 **Running in Docker?** → [`docs/docker.md`](docs/docker.md). The repo ships a Dockerfile; the host-side `compose.yml` is yours to write and is intentionally gitignored.

## ⚙️ Configuration

`.env` carries everything. Required vars are validated at startup; the bot exits with a clear error if any are missing.

- 📜 **Full list with descriptions:** [`docs/env.txt`](docs/env.txt)
- 🔌 **Plugin-specific vars** (e.g. `RELAY_SIGNING_KEY`) live in the plugin's own doc; they go in the same `.env`.
- 🔐 **Discord OAuth2 scopes:** see [`docs/discord_oauth2_perms.png`](docs/discord_oauth2_perms.png) for the exact toggles.

## 🧪 Testing

```bash
pnpm test       # WebdriverIO
pnpm build      # tsc --noEmit (no unit-test framework yet)
```

## 🐛 Bugs and suggestions

Crashing bugs with steps to reproduce: [issues page](https://github.com/Xalior/sir_clive_sinclairbot/issues).

## 📜 License

AGPL-3.0 — see [LICENSE](LICENSE).

---

<p align="center">Made with ☕, 🕹️, and a deep and abiding love for the ZX Spectrum Next.</p>
