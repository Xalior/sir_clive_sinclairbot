# org.xalior.chatbot

Conversation with an LLM. In a guild channel, the bot replies when a message mentions it. In a DM, it accepts the `!help` and `!new` commands but does not chat.

Source: [`plugins/org.xalior.chatbot/chatbot.ts`](../../plugins/org.xalior.chatbot/chatbot.ts)

## Behaviour

In a guild, the plugin acts only on messages that mention the bot. It sends the message to the LLM and replies with the model's response. The plugin keeps each author's conversation history in its Redis store, with a limit of 20 messages. When a new message arrives at the limit, the oldest message drops off.

The plugin adds a short system prompt at the start of every request. It tells the model to include an English translation of a non-English question, and the answer in English.

The plugin calls the model through an OpenAI-compatible client. The source hardcodes the `baseURL` as `https://norma.xalior.com/api/` and the model name as `sir_clive_sinclairbot:latest`. To use a different inference host, change these values in the source.

## Commands

Both commands work in a DM, and in a guild message that mentions the bot.

| Command | Effect |
|---|---|
| `!help` | Sends the user `responses/help.md` by DM, and reacts with `🆘` |
| `!new` | Deletes the user's conversation history, sends `responses/new.md` by DM, and reacts with `0️⃣` |

## Configuration

| Env var | Required | Notes |
|---|---|---|
| `OPENAI_TOKEN` | yes | API token for the OpenAI-compatible endpoint. Core validates it (`src/env.ts`), not the plugin. |

## Storage

The plugin stores each user's conversation history under `<HOSTNAME>:org.xalior.chatbot:<discord-user-id>`, with no TTL. Only `!new` clears it.

## Limits

- The context holds at most 20 messages. The oldest message drops first.
- `max_tokens` for replies is 512.

To change either limit, edit `MAX_CONTEXT_LENGTH` or `MAX_RESPONSE_TOKENS` in the source.
