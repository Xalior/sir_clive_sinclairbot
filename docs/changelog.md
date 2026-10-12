Sir. Clive Sinclairbot Changelog

*WARNING.* The Discord bot itself wrote most of the releases marked with 🧠, by prompting its own large language model. Treat them accordingly.

Unreleased 📚 New per-channel `prompt` setting for `org.xalior.claudebot`, which adds rules for that channel to the system prompt. New per-channel `wikis` setting for `org.xalior.claudebot`. Each wiki in the list gives Claude one read-only tool that searches and reads that MediaWiki site, and Claude cites the page URL in its answer. A channel with no wikis has no tools. The bot reacts with 🔎 while Claude searches a wiki and 📖 while it reads a page. Answers now post in full up to 2000 characters, the Discord limit, and not cut at 1000.

v0.1.0 🍯 Hardening after a security review, with full CSRF coverage, Redis-backed sessions, two-step account linking, rate limiting and a clean dependency audit. New `org.xalior.honeypot` plugin. New `org.xalior.claudebot` plugin, which talks to Claude through the Claude Agent SDK. It keeps one thread per Discord reply chain, supports branches and shows its progress as reactions. Its per-channel `require_account` setting makes it answer only users with a linked account. Plugins can declare the plugins they require with `static requires`.

v0.0.9 📡 Pluggable CSRF-skip and env-schema registries; new HMAC-signed `org.xalior.relay` plugin; full docs suite

v0.0.8 👥 OIDC client, can login & logout, and connect discord account to local account

v0.0.7 ❕ LLM Chatbot plugin can now reset context, and help users

v0.0.6 🤖 LLM Chatbot plugin, but still on unstable plugin API

v0.0.5 🧱 Now uses `pnpm`. Added storage API for all plugins

v0.0.4 🤯 Publicly usable, with example config, more plugins & some docs!

v0.0.3 🧠 First version of the Plugin interface, with simple plugins.

v0.0.2 🤖 Refactor into something a bit neater, add DM to LLM...

v0.0.1 🧠 Initial bot, reproduce original PHP functions, done via open-webui!
