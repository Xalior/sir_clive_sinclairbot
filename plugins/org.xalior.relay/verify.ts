import crypto from 'node:crypto';
import {z} from 'zod';
import type {IncomingHttpHeaders} from 'node:http';
import type PersistanceAdapter from '../../src/persistance_adapter.ts';
import type {RelayErrorCode} from './types.ts';

export interface VerifyContext {
    signingKey: string;
    clockSkew: number;
    persistance: PersistanceAdapter<{ seen: true }>;
    now?: () => number;
}

export interface VerifiedRequest {
    guild_id: string;
    channel_id: string;
    content: string;
}

export type VerifyResult =
    | { ok: true; req: VerifiedRequest }
    | { ok: false; status: number; code: RelayErrorCode; message: string };

const bodySchema = z.object({
    guild_id: z.string().regex(/^\d+$/),
    channel_id: z.string().regex(/^\d+$/),
    content: z.string().min(1).max(2000),
});

function header(headers: IncomingHttpHeaders, name: string): string | undefined {
    const v = headers[name.toLowerCase()];
    if (Array.isArray(v)) return v[0];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}

export async function verifyRequest(
    headers: IncomingHttpHeaders,
    body: unknown,
    rawBody: Buffer | undefined,
    ctx: VerifyContext,
): Promise<VerifyResult> {
    // 1. Headers present.
    const sig = header(headers, 'x-relay-signature');
    const ts = header(headers, 'x-relay-timestamp');
    const nonce = header(headers, 'x-relay-nonce');
    if (!sig || !ts || !nonce) {
        return {ok: false, status: 400, code: 'missing_headers', message: 'missing required relay headers'};
    }

    // 2. Body shape.
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
        return {
            ok: false,
            status: 400,
            code: 'invalid_body',
            message: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
        };
    }
    const {guild_id, channel_id, content} = parsed.data;

    // 3. Canonical string.
    const bodyHashHex = crypto
        .createHash('sha256')
        .update(rawBody ?? Buffer.alloc(0))
        .digest('hex');
    const canonical = `${ts}\n${nonce}\n${guild_id}\n${channel_id}\n${bodyHashHex}`;

    // 4. Expected HMAC.
    const expected = crypto.createHmac('sha256', ctx.signingKey).update(canonical).digest();

    // 5. Compare signatures (constant time).
    let providedBuf: Buffer;
    try {
        providedBuf = Buffer.from(sig, 'hex');
        if (providedBuf.length === 0 && sig.length > 0) throw new Error('empty hex');
    } catch {
        return {ok: false, status: 401, code: 'bad_signature', message: 'signature mismatch'};
    }
    if (providedBuf.length !== expected.length || !crypto.timingSafeEqual(providedBuf, expected)) {
        return {ok: false, status: 401, code: 'bad_signature', message: 'signature mismatch'};
    }

    // 6. Timestamp window.
    const tsNum = Number.parseInt(ts, 10);
    const nowSec = (ctx.now?.() ?? Date.now() / 1000);
    if (Number.isNaN(tsNum) || Math.abs(nowSec - tsNum) > ctx.clockSkew) {
        return {ok: false, status: 401, code: 'stale_timestamp', message: 'timestamp outside skew window'};
    }

    // 7. Nonce replay check.
    const seen = await ctx.persistance.find(nonce);
    if (seen !== undefined) {
        return {ok: false, status: 401, code: 'replayed_nonce', message: 'nonce already used'};
    }
    await ctx.persistance.upsert(nonce, {seen: true}, ctx.clockSkew * 2);

    return {ok: true, req: {guild_id, channel_id, content}};
}
