# 🎩 Sir. Clive Sinclairbot

> 🤖 A plugin-powered Discord channel-manager bot, written in TypeScript — with an LLM chatbot brain, OIDC account linking, a tiny web UI, and a ZX Spectrum Next soul.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

**📋 [Changelog](docs/changelog.md)**

---

## ✨ Features

- 🔌 **Plugin Architecture** — drop-in plugins with their own commands, widgets, navbar links, and user handlers
- 🧠 **LLM Chatbot** — optional OpenAI-backed conversation plugin, resettable context, DM-aware
- 👥 **OIDC Login** — log in, log out, and link your Discord account to a local account
- 🧱 **Shared Storage API** — every plugin gets a persistent store out of the box
- 🛰️ **Discord-native** — slash commands, DMs, registration-by-DM flows
- 🎨 **Mustache-rendered Web UI** — for the bits Discord can't do
- 📦 **pnpm workspaces** — tidy, fast, reproducible installs

## 🧩 Bundled Plugins

| Plugin | What it does |
|--------|--------------|
| `org.xalior.chatbot` 💬 | LLM chat plugin — talks back, remembers, can reset |
| `org.xalior.commands` 🧰 | Core slash-command handlers |
| `org.xalior.supportbot` 🆘 | Support-channel helper |
| `org.xalior.ping` 🏓 | The obligatory `ping` / `pong` |
| `org.xalior.example` 📖 | Minimal reference plugin — copy this to start your own |

## 🚀 Quick Start

```bash
# Clone and install (pnpm only — enforced via preinstall)
git clone https://github.com/Xalior/sir_clive_sinclairbot.git
cd sir_clive_sinclairbot
pnpm install

# Configure
cp env.sample .env
# …then edit .env (see Configuration below)

# Run
pnpm dev        # hot-reloading dev mode
pnpm start      # plain run
pnpm build      # type-check only
pnpm test       # WebdriverIO test suite
```

## ⚙️ Configuration

All config lives in `.env` — copy `env.sample` and edit.

| Variable | Default | Description |
|----------|---------|-------------|
| `BOT_TOKEN` | _(required)_ | Your Discord bot token |
| `OPENAI_TOKEN` | _(optional)_ | OpenAI key — only needed for the chatbot plugin |
| `CACHE_URL` | `mem://` | Storage backend — `mem://` (ephemeral) or `redis://…` |

### 🔐 Discord Permissions

The bot needs OAuth2 scopes for slash commands, DM messaging, and member management. See [`docs/discord_oauth2_perms.png`](docs/discord_oauth2_perms.png) for the exact set of toggles.

## 🧪 Testing

```bash
pnpm test       # runs WebdriverIO
pnpm wdio       # same thing, explicit
```

## 🐛 Bugs & Suggestions

Please report crashing bugs **with steps to reproduce** over at the [issues page](https://github.com/Xalior/sir_clive_sinclairbot/issues).

## 📜 License

AGPL-3.0 — see [LICENSE](LICENSE).

---

<p align="center">Made with ☕, 🕹️, and a deep and abiding love for the ZX Spectrum Next.</p>
