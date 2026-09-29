# org.xalior.relay

One HTTP endpoint that lets a service on your LAN post a plain-text message to a Discord guild and channel through the bot. The endpoint checks an HMAC-SHA256 signature made with a shared key, and rejects replayed requests. The Discord credentials stay on the bot host.

Source: [`plugins/org.xalior.relay/`](../../plugins/org.xalior.relay/)

## Endpoint

```
POST /api/relay/v1/send
Content-Type: application/json
X-Relay-Timestamp: <unix-seconds>
X-Relay-Nonce: <opaque random string>
X-Relay-Signature: <hex HMAC-SHA256 of canonical string>
```

Body:

```json
{
    "guild_id":  "1311811245179015271",
    "channel_id":"1358480677842059416",
    "content":   "anything up to 2000 chars"
}
```

Both IDs must be numeric strings (Discord snowflakes). `content` must be between 1 and 2000 characters. 2000 is Discord's maximum message length.

## Response

The relay handler answers with JSON, in one of these shapes:

```json
{ "ok": true, "message_id": "1501663540317130802" }
```

```json
{ "ok": false, "error": { "code": "<code>", "message": "<text>" } }
```

On success, `message_id` is the Discord snowflake of the posted message. On error, `message` depends on the code. For `forbidden` and `discord_error`, it is Discord's own error text, unchanged. For `internal`, it is the text of the error that occurred. For all other codes, it is a short explanation.

### Error codes

| Code | Status | Cause |
|---|---|---|
| `missing_headers` | 400 | an `X-Relay-*` header is absent or empty |
| `invalid_body` | 400 | the body fails schema validation, for example a missing field, a non-numeric ID or content that is too long |
| `bad_signature` | 401 | the computed HMAC does not match, or the signature is not valid hex |
| `stale_timestamp` | 401 | `\|now − ts\|` exceeds `RELAY_CLOCK_SKEW` |
| `replayed_nonce` | 401 | a request used this nonce within the TTL window |
| `channel_not_found` | 404 | Discord cannot find `channel_id` |
| `channel_not_text` | 400 | the channel is not text-based, for example a forum or a category |
| `wrong_guild` | 400 | the channel is not in the given `guild_id`, or it is a DM channel |
| `forbidden` | 403 | Discord returned 50001 (Missing Access) or 50013 (Missing Permissions) |
| `discord_error` | 502 | any other `DiscordAPIError` |
| `internal` | 500 | any error that is not a `DiscordAPIError`, for example a network error |

## Signing

The canonical string is these lines, in this order, joined with `\n`:

```
<timestamp>
<nonce>
<guild_id>
<channel_id>
<sha256(rawBody) as hex>
```

`rawBody` is the exact bytes of the JSON request body. Sign the body before any reformatting. Compute `HMAC-SHA256(canonical, RELAY_SIGNING_KEY)` and send the result as hex in `X-Relay-Signature`.

The handler checks, in this order, the headers, the body shape, the HMAC, the timestamp window and the nonce. It checks the HMAC before the timestamp and the nonce, so an attacker without the key cannot learn whether a timestamp is valid.

The comparison is constant-time (`crypto.timingSafeEqual`). Invalid hex also gives `bad_signature`. The response does not tell the caller whether the hex was invalid or the value was wrong.

## Configuration

| Env var | Required | Default | Notes |
|---|---|---|---|
| `RELAY_SIGNING_KEY` | yes | none | Shared HMAC key. The bot does not start without it. |
| `RELAY_CLOCK_SKEW` | no | 30 | Tolerance window in seconds. The handler rejects a request with `\|now − ts\| > skew` as `stale_timestamp`. |

The plugin declares both vars with `static envSchema`. Core validates them at startup. They are not in `src/env.ts`.

## Replay protection

For each accepted request, the plugin stores the nonce in Redis with a TTL of `2 × RELAY_CLOCK_SKEW`. A second request with the same nonce within that time gets `replayed_nonce`. After the TTL ends, the nonce can be used again. This is the smallest TTL that covers the skew window in both directions.

Senders should make a new random nonce for each request. 16 random bytes, hex-encoded, are sufficient.

## Discord checks

The handler checks that the channel is in the given `guild_id`. A request that names guild A and a channel ID from guild B fails with `wrong_guild`. It does not post to the guild that owns the channel. The handler rejects DM channels, which have no `guildId`, in the same way. Version 1 of the API does not support DMs.

## Quotas and rate limiting

The plugin has no quotas or rate limits of its own. discord.js has its own rate-limit queue, and the relay uses it.

## What is not logged

- The plugin writes no console output for a relay request, whether it succeeds or fails.
- It writes nothing to the guild's `log_channel_id`.
- It writes nothing to plugin storage except the nonce entry.

If you need an audit trail, keep it on the calling side.

## A minimal Node client

Save this as `relay-send.js`, outside the repo:

```js
const crypto = require('crypto');
const http = require('http');

const KEY = process.env.RELAY_SIGNING_KEY;
const guild_id   = '1311811245179015271';
const channel_id = '1358480677842059416';
const content    = process.argv.slice(2).join(' ') || 'hello';

const ts = Math.floor(Date.now() / 1000);
const nonce = crypto.randomBytes(16).toString('hex');
const body = JSON.stringify({ guild_id, channel_id, content });
const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
const canonical = `${ts}\n${nonce}\n${guild_id}\n${channel_id}\n${bodyHash}`;
const sig = crypto.createHmac('sha256', KEY).update(canonical).digest('hex');

const req = http.request({
    host: 'localhost', port: 8443, method: 'POST',
    path: '/api/relay/v1/send',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Relay-Timestamp': String(ts),
        'X-Relay-Nonce': nonce,
        'X-Relay-Signature': sig,
    },
}, res => {
    let buf = '';
    res.on('data', c => buf += c);
    res.on('end', () => console.log(res.statusCode, buf));
});
req.write(body);
req.end();
```

Run with `RELAY_SIGNING_KEY=<key> node relay-send.js "hello world"`.
