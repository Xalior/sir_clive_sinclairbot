# org.xalior.ping

Replies to `!ping` with a count of pongs for the guild.

Source: [`plugins/org.xalior.ping/ping.ts`](../../plugins/org.xalior.ping/ping.ts)

## Behaviour

When a message is exactly `!ping`, the plugin adds one to the guild's counter in its Redis store and replies `I've ponged N time(s)!`. It ignores all other messages.

Use it to check that the bot reads messages and that storage works. If the counter continues from its old value after a restart, the Redis connection is correct.

## Configuration

None.

## Storage

One key, `pingcounter`, holds `{ [guildId]: { count } }`, with no TTL.

## Limits

The object gets larger with each new guild, with no limit. For a reference plugin this is acceptable. If you copy the plugin for real use, use one key per guild, not one large object.
