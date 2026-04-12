# Sir. Clive Sinclairbot 🎩🤖
## A Plugin-Powered Discord Channel-Manager for the ZX Spectrum Next Community

<p align="center">
  <img src="docs/avatar.png" alt="Sir. Clive Sinclairbot" width="256" />
</p>

> *"He's polite. He's pluggable. He's presiding over your channel."* 🫡

A friendly, extensible Discord bot built in TypeScript — with a plugin API, an LLM chatbot brain 🧠, OIDC account linking 🔐, a tiny web UI 🌐, and a retro-computing soul 🕹️.

---

## ✨ Features

* 🔌 **Plugin Architecture** — drop-in plugins with their own commands, widgets, navbar links and user handlers
* 🧠 **LLM Chatbot** — optional OpenAI-backed conversation plugin, resettable context, DM-aware
* 👥 **OIDC Login** — log in, log out, and link your Discord account to a local account
* 🧱 **Shared Storage API** — every plugin gets a persistent store out of the box
* 🛰️ **Discord-native** — slash commands, DMs, registration-by-DM flows
* 🎨 **Mustache-rendered web UI** — for the bits Discord can't do
* 📦 **pnpm workspaces** — tidy, fast, reproducible installs

## 🧩 Bundled Plugins

| Plugin | What it does |
| ------ | ------------ |
| `org.xalior.chatbot` 💬 | LLM chat plugin — talks back, remembers, can reset |
| `org.xalior.commands` 🧰 | Core slash-command handlers |
| `org.xalior.supportbot` 🆘 | Support-channel helper |
| `org.xalior.ping` 🏓 | The obligatory `ping` / `pong` |
| `org.xalior.example` 📖 | Minimal reference plugin — copy this to start your own |

## 🚀 Getting Started

```bash
# 1. Clone
git clone git@github.com:Xalior/sir_clive_sinclairbot.git
cd sir_clive_sinclairbot

# 2. Install (pnpm only — enforced via preinstall)
pnpm install

# 3. Configure
cp env.sample .env
#   BOT_TOKEN="..."      # your Discord bot token
#   OPENAI_TOKEN="..."   # only if you want the chatbot plugin
#   CACHE_URL="mem://"   # or redis://... for persistence

# 4. Run
pnpm dev        # hot-reloading dev mode
pnpm start      # plain run
pnpm build      # type-check only
pnpm test       # WebdriverIO test suite
```

## 📜 Version History

### v0.0.8 — 👥 *Who are you again?*
OIDC client: login, logout, and link your Discord account to a local account.

### v0.0.7 — ❕ *Have you tried turning it off and on again?*
LLM Chatbot plugin can now reset its context and help users.

### v0.0.6 — 🤖 *It talks back!*
LLM Chatbot plugin lands (still on the unstable plugin API).

### v0.0.5 — 🧱 *Bricks and mortar*
Switched to `pnpm`. Added the shared storage API for plugins.

### v0.0.4 — 🤯 *Actually useable*
Publicly usable, with example config, more plugins, and some docs!

### v0.0.3 — 🧠 *Plugged in*
First version of the Plugin interface, with simple plugins.

### v0.0.2 — 🤖 *Tidy up, tidy up*
Refactor into something a bit neater. Added DM-to-LLM.

### v0.0.1 — 🧠 *Hello world*
Initial bot — reproduced the original PHP functions via open-webui.

> 🧠 *Releases marked with a brain were primarily written by the bot itself, via prompting its own LLM. Treat accordingly.* 😉

## 🐛 Bugs & Suggestions

Please report crashing bugs **with steps to reproduce** over at the [issues page](https://github.com/Xalior/sir_clive_sinclairbot/issues).

## 📄 License

AGPL-3.0 — see [LICENSE](LICENSE).

---

<p align="center">Made with ☕, 🕹️, and a deep and abiding love for the ZX Spectrum Next.</p>
