# Roadmap

Forward-looking scope. Items here are agreed direction, not yet planned in detail. Each becomes its own discovery + plan pass before implementation.

## v0.1.0

- **Monorepo reorg.** Split the current single-package layout into `webapp/` and `cli/` directories (pnpm workspace). The bot-as-it-stands becomes the webapp; a new CLI surface lives alongside.
- **DM support in `org.xalior.relay`.** The plugin currently rejects DM channels with `wrong_guild` (DMs have no `guildId`). Adding DMs means revisiting that rule and the request shape — likely a `recipient_id` field that's mutually exclusive with `channel_id`. Discovery pass needed first.

## Done

- **v0.0.9** — pluggable CSRF-skip and env-schema registries; new HMAC-signed `org.xalior.relay` plugin; full docs suite. See [changelog](changelog.md).
