# org.xalior.chatbot

LLM-backed conversation. The bot replies when mentioned in a guild channel; in DMs it accepts the two control commands but does not chat freely.

Source: [`plugins/org.xalior.chatbot/chatbot.ts`](../../plugins/org.xalior.chatbot/chatbot.ts)

## Behaviour

In a guild, the plugin only acts on messages that mention the bot. It strips the mention, sends the remainder to the configured LLM, and replies with the model's response. Per-author conversation history is persisted in the plugin's Redis store and capped at 20 turns — the oldest message drops off when a new one arrives.

A short system prompt is prepended to every request asking the model to translate non-English questions into English alongside the answer.

The model is called via an OpenAI-compatible client. The `baseURL` is currently hardcoded to `https://norma.xalior.com/api/` and the model name to `sir_clive_sinclairbot:latest` — change these in the source if you point at a different inference host.

## Commands

Both work in a DM and in a mentioned guild message.

| Command | Effect |
|---|---|
| `!help` | DMs the user the contents of `responses/help.md`, reacts with the help emoji |
| `!new` | Wipes the user's conversation history, DMs `responses/new.md`, reacts with `0️⃣` |

## Configuration

| Env var | Required | Notes |
|---|---|---|
| `OPENAI_TOKEN` | yes | API token for the OpenAI-compatible endpoint. Validated by core (`src/env.ts`), not by the plugin. |

## Storage

Per-user conversation history under `<HOSTNAME>:org.xalior.chatbot:<discord-user-id>`. No TTL — `!new` is the only thing that clears it.

## Limits

- Context length capped at 20 messages (oldest dropped first).
- `max_tokens` for replies capped at 512.

Tune both in the source if you want a different conversational shape.
