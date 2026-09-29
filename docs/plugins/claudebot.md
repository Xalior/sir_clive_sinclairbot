# org.xalior.claudebot

A conversation plugin that answers through Claude, using the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`). Each Discord reply chain is one conversation with its own history, so several people can talk to the bot in one channel at the same time.

Source: [`plugins/org.xalior.claudebot/claudebot.ts`](../../plugins/org.xalior.claudebot/claudebot.ts)

## Behaviour

In a guild channel the plugin sees every message that passes the channel filters. It acts on a message that mentions the bot, or that replies to a message from the bot. It removes the bot mention from the text before it sends the text to Claude.

The model is Claude Sonnet 5.5 (`claude-sonnet-5-5`). Claude has no tools, and the SDK loads no settings or `CLAUDE.md` files from disk (`tools: []`, `settingSources: []`). The plugin sends the Discord text exactly as written, so text such as `@file` or `/command` has no special meaning (`verbatimPrompts: true`).

### Threads

A thread is a Discord reply chain, not the Discord channel feature of the same name. The user who starts a thread owns it.

| Message | Result |
|---|---|
| Mentions the bot, and is not a reply | Starts a new thread. |
| The owner replies to the latest bot answer in a thread | Continues the thread. A mention is not necessary. |
| The owner replies to an older bot answer in a thread | Starts a branch: a new thread with the history up to that answer. The original thread does not change, and a reply to its latest answer still continues it. |
| Another user replies to a bot answer | Starts a new thread for that user. |
| Mentions the bot, and replies to a message that is not from the bot | Starts a new thread. |
| Replies to a bot answer whose thread has expired | The bot replies that the thread has expired. |

A new thread that starts from a reply gets two text blocks: first the replied-to message with its author's display name, then the new text.

The bot also treats a reply to any other message the bot posted (for example, a message from another plugin) as a reply to an expired thread, because it has no record of that message.

### System prompt

The plugin builds the system prompt when a thread starts. It is the persona, then two fixed lines:

- `Keep every response under 1000 characters.`
- `You are talking to <display name>.`, with the server display name of the user who starts the thread.

The default persona is the `DEFAULT_PERSONA` constant in the source. `CLAUDEBOT_SYSTEM_PROMPT` replaces it. Claude Code records the system prompt when the thread starts, so a changed persona applies to new threads only. Because the prompt contains the owner's name, a reply from another user starts a new thread.

### Answers

The plugin cuts an answer to 1000 characters before it posts the answer as a reply. The SDK has no option to limit output tokens, so the system prompt line and this cut are the only limits.

### Progress reactions

The bot shows its progress as reactions on the user's message:

| Reaction | Meaning |
|---|---|
| 🤖 | The plugin accepted the message. This reaction stays. |
| 🤔 | Claude is thinking. |
| ✍️ | Claude is writing the answer. This replaces 🤔. |
| ❌ | The answer failed. The error is in the bot's log. |

When the reply is posted, the plugin removes the progress reaction, so only 🤖 stays. A simple question can go directly to ✍️. The plugin removes only its own reactions.

## Commands

| Command | Where | Effect |
|---|---|---|
| `!help` | In a DM, or in a guild message that mentions the bot | Sends the author `responses/help.md` by DM and reacts with 🆘. Nothing is posted in the channel. |

There is no command to start a new conversation. A new mention starts a new thread.

## Channel config

A channel turns the plugin on in `guilds.js` under `pass.plugin`, with either `true` or an object:

```js
pass: {
    plugin: {
        'org.xalior.claudebot': { require_account: true },
    },
},
```

| Field | Default | Effect |
|---|---|---|
| `require_account` | off | When `true`, the bot answers only users who have linked their Discord account with `!register`. Any other value, or a config of `true`, leaves this off. |

With `require_account: true`, a user with no linked account gets a reply that tells them to link it with `!register`. The bot does not add reactions and does not call Claude for that message. The check reads only the stored link record, so it does not depend on the user's login session.

`!register` comes from `org.xalior.commands`. The plugin declares `static requires = ['org.xalior.commands']`, so the bot does not start if `org.xalior.commands` is missing from `data/plugins.ts`, even when no channel sets `require_account`. Users can send `!register` to the bot in a DM.

## Configuration

| Env var | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | one of these two | A Claude API key. |
| `CLAUDE_CODE_OAUTH_TOKEN` | one of these two | A token from `claude setup-token`, for a Claude Pro, Max, Team or Enterprise plan. The token is valid for one year. |
| `CLAUDEBOT_SYSTEM_PROMPT` | no | Replaces the default persona. |

The bot does not start if neither `ANTHROPIC_API_KEY` nor `CLAUDE_CODE_OAUTH_TOKEN` is set, or if both are empty. If both are set, Claude Code uses `ANTHROPIC_API_KEY`.

`CLAUDE_CODE_OAUTH_TOKEN` is for one subscriber's own use. A public instance, or an instance for a company, must use `ANTHROPIC_API_KEY`. See the [Claude Code legal and compliance page](https://code.claude.com/docs/en/legal-and-compliance).

All three vars are declared on the plugin with `static envSchema`, and core validates them at startup.

Claude Code runs as a separate process. It does not get a copy of the bot's environment, so it never holds the Discord token or other secrets. It gets only `CLAUDE_CONFIG_DIR`, the Claude credentials that are set, and these variables when they are set: `PATH`, `HOME`, `TMPDIR`, `LANG`, `LC_ALL`, `TZ`, `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` (and their lowercase forms), `NODE_EXTRA_CA_CERTS` and `SSL_CERT_FILE`. The list is `SDK_ENV_ALLOWLIST` in the source.

## Storage

Two kinds of entry in the plugin's Redis store. Both expire 10 days after they are written.

| Key | Value |
|---|---|
| `<HOSTNAME>:org.xalior.claudebot:msg:<bot reply ID>` | The thread's session ID, the owner's user ID, and the ID of the answer's last assistant message (used to start a branch). |
| `<HOSTNAME>:org.xalior.claudebot:session:<session ID>` | The ID of the latest bot reply in that thread. |

Claude Code keeps the conversation history itself, as session transcripts in `data/claude` (the `CLAUDE_CONFIG_DIR` the plugin passes to Claude Code). In the container, this directory is `/data/claude` in the `/data` mount. The plugin passes the Claude Code setting `cleanupPeriodDays: 10`, so Claude Code deletes transcripts after 10 days, the same period as the Redis entries.
