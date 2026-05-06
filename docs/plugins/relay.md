# org.xalior.relay

A single HTTP endpoint that lets a LAN service post a plain-text message into a Discord guild + channel by way of the bot. Authenticated by HMAC-SHA256 with a shared key, with replay protection. No Discord credentials leave the bot host.

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

Both ids must be numeric strings (Discord snowflakes). `content` is between 1 and 2000 characters — that's Discord's hard cap.

## Response

Always JSON. Always one of two shapes:

```json
{ "ok": true, "message_id": "1501663540317130802" }
```

```json
{ "ok": false, "error": { "code": "<code>", "message": "<text>" } }
```

The success branch returns the Discord snowflake of the posted message. The error branch's `message` carries Discord's own error text verbatim where the failure originates from Discord (permissions, channel resolution, API errors); for caller-side failures it's a short human-readable explanation.

### Error codes

| Code | Status | Cause |
|---|---|---|
| `missing_headers` | 400 | one of the three `X-Relay-*` headers is absent or empty |
| `invalid_body` | 400 | body fails schema validation (missing field, non-numeric id, content too long, etc.) |
| `bad_signature` | 401 | computed HMAC didn't match, or the provided signature wasn't valid hex |
| `stale_timestamp` | 401 | `\|now − ts\|` exceeds `RELAY_CLOCK_SKEW` |
| `replayed_nonce` | 401 | this nonce was used within the active TTL window |
| `channel_not_found` | 404 | Discord couldn't resolve `channel_id` |
| `channel_not_text` | 400 | resolved channel isn't text-capable (e.g. voice, forum root) |
| `wrong_guild` | 400 | the channel doesn't belong to the claimed `guild_id` (DM channels also fall here) |
| `forbidden` | 403 | Discord returned 50001 (Missing Access) or 50013 (Missing Permissions) |
| `discord_error` | 502 | any other `DiscordAPIError` |
| `internal` | 500 | non-Discord throw (network, unexpected) |

## Signing

The canonical string is five lines joined with `\n`, in this order:

```
<timestamp>
<nonce>
<guild_id>
<channel_id>
<sha256(rawBody) as hex>
```

`rawBody` is the exact byte sequence of the JSON request body — sign before any reformatting. Compute `HMAC-SHA256(canonical, RELAY_SIGNING_KEY)` and send the result as hex in `X-Relay-Signature`.

The check order is: header presence, body shape, HMAC compare, timestamp window, nonce check. HMAC is verified before time and nonce so an attacker without the key can't probe timestamp validity.

Comparison is constant-time (`crypto.timingSafeEqual`). Hex decode failures are reported as `bad_signature` — the response intentionally doesn't distinguish "bad hex" from "good hex, wrong value".

## Configuration

| Env var | Required | Default | Notes |
|---|---|---|---|
| `RELAY_SIGNING_KEY` | yes | — | shared HMAC key. Bot refuses to start without it. |
| `RELAY_CLOCK_SKEW` | no | 30 | tolerance window in seconds. Requests with `\|now − ts\| > skew` are rejected as `stale_timestamp`. |

Both vars are declared on the plugin via `static envSchema`; they are validated centrally at boot and never appear in `src/env.ts`.

## Replay protection

Each accepted request stores its nonce in Redis with TTL `2 × RELAY_CLOCK_SKEW`. Any second request with the same nonce within that window returns `replayed_nonce`. After the TTL elapses the nonce is reusable — that's the smallest TTL that fully covers the skew window in both directions, by design.

Senders should generate a fresh random nonce per request (16 random bytes hex-encoded is fine).

## Discord-side guarantees

The handler verifies that the resolved channel actually belongs to the claimed `guild_id`. A request that names guild A but a channel id from guild B fails with `wrong_guild` rather than silently posting to whichever guild owns the channel. DM channels (no `guildId`) are rejected the same way — DMs aren't in scope for v1.

## Quotas and rate limiting

None at the plugin level. discord.js handles its own rate-limit queue; the relay defers to it.

## What is not logged

- No console output for any relay request, success or failure.
- No write to the per-guild `log_channel_id`.
- No plugin-storage write beyond the nonce store entry itself.

If you need an audit trail, run it on the calling side — the bot is intentionally quiet here.

## Example: a minimal Node client

Save as `relay-send.js` outside the repo:

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
