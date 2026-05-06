# org.xalior.ping

Replies `!ping` with a per-guild pong counter.

Source: [`plugins/org.xalior.ping/ping.ts`](../../plugins/org.xalior.ping/ping.ts)

## Behaviour

When a message arrives whose content is exactly `!ping`, the plugin increments a per-guild counter in its Redis store and replies with `I've ponged N time(s)!`. Anything else is ignored.

This is a useful smoke for "is the bot reading messages, is its persistence working" — if the counter advances after a restart, Redis is wired correctly.

## Configuration

None.

## Storage

A single key `pingcounter` holding `{ [guildId]: { count } }`. No TTL.

## Limits

The data shape would grow indefinitely with new guilds. For a reference plugin that's fine; if you copy it into something more serious, consider per-guild keys instead of one fat object.
