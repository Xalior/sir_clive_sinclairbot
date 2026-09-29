# org.xalior.honeypot

Mutes anyone who posts in a trap channel. Spam bots read the channel list and post in every channel. Human users read the pinned message that explains the trap, and do not post. A user who posts gets a server timeout at once. The channel config can also delete the message.

Source: [`plugins/org.xalior.honeypot/honeypot.ts`](../../plugins/org.xalior.honeypot/honeypot.ts)

## Behaviour

When a message arrives in a channel that uses this plugin, the plugin mutes the author with a Discord member timeout (`communication_disabled_until`). The reason for the mute is "Posted in honeypot channel".

Exemptions and special cases:

- **Staff are exempt.** The plugin skips any member with the *Moderate Members* permission, and reports the skip. A moderator who posts in the trap does not mute themselves.
- **Bots never trigger it.** Core drops bot-authored messages before any plugin runs.
- **A failed mute does not throw.** Discord rejects the timeout if, for example, the member's highest role is above the bot's highest role. The plugin reports the failure, and the other channel actions, `log` and `delete`, still run.

## Configuration

The plugin takes one config parameter. Set it for each channel in the plugin action in `data/guilds.js`.

| Param | Required | Default | Notes |
|---|---|---|---|
| `timeout_minutes` | no | 1440 (1 day) | Length of the mute. The plugin reduces values above Discord's 28-day maximum to 28 days. |

Channel selection, message deletion and reports to the log channel are not plugin config. They are the standard fields of a channel entry, as for every other plugin.

```js
// #honeypot
{
    channel_id: "<honeypot channel id>",
    filters: { all: true },
    pass: {
        plugin: { 'org.xalior.honeypot': { timeout_minutes: 1440 } },
        delete: true,     // delete the spam
        log: true         // action report to the guild's log channel
    }
},
```

The plugin has no env vars.

## Reporting

The plugin adds its result to the standard action report. The result is `muted <user> for <n>m`, `<user> is staff, not muted`, or `FAILED to mute <user> — <error>`. With `log: true`, the report goes to the guild's `log_channel_id`, with the original message and its author.

## Requirements

- The bot needs the **Moderate Members** permission in the guild. Discord also calls it *Timeout Members*.
- `@everyone` must be able to see the trap channel and post in it. Pin one message that explains that the channel is a honeypot. Humans read pinned messages, and spam bots do not.

## Storage

None.

## Limits

A timeout lasts at most 28 days. The honeypot holds a user until a moderator decides what to do. It does not ban. The bot cannot time out a member whose highest role is above the bot's highest role. The plugin reports those attempts as failures in the log channel.
