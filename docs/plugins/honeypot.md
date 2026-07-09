# org.xalior.honeypot

Mutes anyone who posts in a designated trap channel. Spam bots scrape the channel list and post everywhere; real users read the pinned explainer and don't. Anyone who posts gets an instant server timeout, and the message is scrubbed.

Source: [`plugins/org.xalior.honeypot/honeypot.ts`](../../plugins/org.xalior.honeypot/honeypot.ts)

## Behaviour

When a message arrives in a channel this plugin is attached to, the author is muted via a Discord member timeout (`communication_disabled_until`). The mute reason is recorded as "Posted in honeypot channel".

Exemptions and edge cases:

- **Staff are exempt.** Any member holding the *Moderate Members* permission is skipped (and the skip is reported) — a moderator posting in the trap must not self-mute.
- **Bots never trigger it.** Core drops bot-authored messages before any plugin runs.
- **A failed mute never throws.** If Discord rejects the timeout (typically role hierarchy: the target's highest role outranks the bot's), the failure is reported and the rest of the action pipeline — `log`, `delete` — still runs.

## Configuration

The plugin takes one config parameter, passed per-channel through the plugin action in `data/guilds.js`:

| Param | Required | Default | Notes |
|---|---|---|---|
| `timeout_minutes` | no | 1440 (1 day) | mute duration; values above Discord's 28-day maximum are clamped |

Channel selection, message deletion, and log-channel reporting are not plugin config — they're the standard per-channel entry flags, same as every other plugin:

```js
// #honeypot
{
    channel_id: "<honeypot channel id>",
    filters: { all: true },
    pass: {
        plugin: { 'org.xalior.honeypot': { timeout_minutes: 1440 } },
        delete: true,     // scrub the spam
        log: true         // action report to the guild's log channel
    }
},
```

No env vars.

## Reporting

The plugin appends its outcome (`muted <user> for <n>m`, `<user> is staff, not muted`, or `FAILED to mute <user> — <error>`) to the standard action report, so with `log: true` it lands in the guild's `log_channel_id` alongside the original message and author.

## Requirements

- The bot needs the **Moderate Members** (a.k.a. *Timeout Members*) permission in the guild.
- The trap channel must be visible and postable by `@everyone`. Pin one message explaining that it's a honeypot — humans read pins, spam bots don't.

## Storage

None.

## Limits

A timeout caps at 28 days — a honeypot catch is a "hold them until a mod decides" measure, not a ban. Members whose highest role outranks the bot's cannot be timed out; those attempts are reported as failures in the log channel.
