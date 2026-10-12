# org.xalior.claudebot

A conversation plugin that answers through Claude, using the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`). Each Discord reply chain is one conversation with its own history, so several people can talk to the bot in one channel at the same time.

Source: [`plugins/org.xalior.claudebot/claudebot.ts`](../../plugins/org.xalior.claudebot/claudebot.ts)

## Behaviour

In a guild channel the plugin sees every message that passes the channel filters. It acts on a message that mentions the bot, or that replies to a message from the bot. It removes the bot mention from the text before it sends the text to Claude.

The model is Claude Sonnet 5.5 (`claude-sonnet-5-5`). Claude has none of the Claude Code built-in tools, and the SDK loads no settings or `CLAUDE.md` files from disk (`tools: []`, `settingSources: []`). The only tools are the wiki tools of the channel, if the channel has wikis (see [Wiki tools](#wiki-tools)). The plugin sends the Discord text exactly as written, so text such as `@file` or `/command` has no special meaning (`verbatimPrompts: true`).

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

The plugin builds the system prompt when a thread starts. It has these parts, in this order:

- The persona.
- The channel's `prompt`, if the channel config has one (see [Channel config](#channel-config)). It adds rules to the persona and does not replace it.
- `Keep every response under 1000 characters.`
- A line that tells Claude to answer what was asked and then stop, without a closing question or an offer of more help.
- `You are talking to <display name>.`, with the server display name of the user who starts the thread.

The default persona is the `DEFAULT_PERSONA` constant in the source. `CLAUDEBOT_SYSTEM_PROMPT` replaces it. Claude Code records the system prompt when the thread starts, so a changed persona applies to new threads only. Because the prompt contains the owner's name, a reply from another user starts a new thread.

### Answers

The system prompt asks for less than 1000 characters, but Claude can write more. The plugin posts the answer in full up to 2000 characters, the Discord limit for one message, and cuts a longer answer at 2000. The SDK has no option to limit output tokens, so the system prompt line and this cut are the only limits.

### Progress reactions

The bot shows its progress as reactions on the user's message:

| Reaction | Meaning |
|---|---|
| 🤖 | The plugin accepted the message. This reaction stays. |
| 🤔 | Claude is thinking. |
| 🔎 | Claude is searching a wiki. |
| 📖 | Claude is reading a wiki page. |
| ✍️ | Claude is writing the answer. |
| ❌ | The answer failed. The error is in the bot's log. |

Each progress reaction replaces the one before it. 🔎 and 📖 show when Claude calls a [wiki tool](#wiki-tools), so they show only in a channel with wikis. Any reaction can show more than once, for example 🤔 again after each wiki call. When the reply is posted, the plugin removes the progress reaction, so only 🤖 stays. A simple question can go directly to ✍️. The plugin removes only its own reactions.

### Wiki tools

Each entry in a channel's `wikis` list gives Claude one tool, `mcp__wiki__<id>`. Claude can reach only the wikis in the list, and a channel with no list has no tools. A thread gets the tools of the channel it is in.

| Field | Required | Notes |
|---|---|---|
| `id` | yes | The tool name. Lowercase letters, digits and `_` only, and unique in the list. |
| `name` | yes | The wiki name that Claude sees in the tool description. |
| `api` | yes | The URL of the wiki's `api.php`. |
| `about` | no | One line about the wiki's subject. It goes into the tool description, so Claude can choose the right wiki. |

The tool has two actions:

| Action | What it does |
|---|---|
| `search` | A title search, then a full text search, through the MediaWiki API `list=search`. Title matches come first. Without `srwhat`, the MediaWiki database search backend matches titles only, so the tool does both searches. |
| `page` | The page as plain text, through `prop=extracts`, with the page URL. It follows redirects, and it cuts a page at 50,000 characters. |

The wiki must have the TextExtracts extension, which is part of the MediaWiki release. The `page` action fails on a wiki without it. With its default settings, TextExtracts removes all `table` and `div` elements from the text. On a wiki that keeps data in tables or templates, change `$wgExtractsRemoveClasses` in `LocalSettings.php` to keep them. A plain assignment adds to the default list and does not replace it, so set it from `$wgExtensionFunctions`:

```php
wfLoadExtension( 'TextExtracts' );
$wgExtensionFunctions[] = static function () {
    $GLOBALS['wgExtractsRemoveClasses'] = [ 'figure', 'script', 'input', 'style', 'ul.gallery',
        '.mw-editsection', 'sup.reference', 'ol.references', '.error', '.nomobile',
        '.noprint', '.noexcerpt', '.sortkey', '.toc' ];
};
```

TextExtracts keeps each extract in its cache until the page changes, and a change to this setting does not clear the cache. After a change, purge the pages, for example with `maintenance/run.php purgePage`. Wait until PHP has loaded the new `LocalSettings.php` (the `opcache.revalidate_freq` time) before you purge, or the old setting makes the new extracts.

The plugin sends the wiki requests itself, with the user agent `sir_clive_sinclairbot (+https://github.com/Xalior/sir_clive_sinclairbot)`. The Claude Code process does not connect to the wiki. The plugin checks the `wikis` list when a message comes in. If the list is not valid, the bot reacts with ❌ and writes the error to its log.

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
        'org.xalior.claudebot': {
            require_account: true,
            prompt: 'This channel is for ZX Spectrum Next support only. For any other request, reply with one short sentence that says so, and then stop.',
            wikis: [
                {
                    id: 'specnext',
                    name: 'SpecNext Wiki',
                    api: 'https://wiki.specnext.dev/api.php',
                    about: 'ZX Spectrum Next hardware, Next registers, ports, NextZXOS and the Copper.',
                },
            ],
        },
    },
},
```

| Field | Default | Effect |
|---|---|---|
| `require_account` | off | When `true`, the bot answers only users who have linked their Discord account with `!register`. Any other value, or a config of `true`, leaves this off. |
| `prompt` | none | Text that the plugin adds to the system prompt after the persona, for example rules that keep the bot on the channel topic. See [System prompt](#system-prompt). |
| `wikis` | none | The MediaWiki sites that Claude can search and read in this channel. Each wiki becomes one tool. See [Wiki tools](#wiki-tools). |

With `require_account: true`, a user with no linked account gets a DM that tells them to link it with `!register`, and the bot reacts to their message with 🤖 and 🔒. A user whose linked account is suspended gets a DM that says so, with the same reactions. The suspended flag comes from the user info that the OpenID provider returned when the user linked the account, so a suspension after that date does not show. Nothing is posted in the channel, and the bot does not call Claude for that message. The check reads the stored link record and the stored claim, so it does not depend on the user's login session or on token expiry.

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
