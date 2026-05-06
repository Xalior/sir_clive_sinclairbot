import {Client, DiscordAPIError} from 'discord.js';
import type {RelayErrorCode} from './types.ts';
import type {VerifiedRequest} from './verify.ts';

export type DeliverResult =
    | { ok: true; message_id: string }
    | { ok: false; status: number; code: RelayErrorCode; message: string };

export async function deliverMessage(client: Client, req: VerifiedRequest): Promise<DeliverResult> {
    const channel = await client.channels.fetch(req.channel_id).catch(() => null);
    if (!channel) {
        return {ok: false, status: 404, code: 'channel_not_found', message: 'channel not found'};
    }
    if (!channel.isTextBased()) {
        return {ok: false, status: 400, code: 'channel_not_text', message: 'channel is not text-based'};
    }
    const guildId = (channel as { guildId?: string | null }).guildId ?? null;
    if (guildId !== req.guild_id) {
        return {ok: false, status: 400, code: 'wrong_guild', message: 'channel does not belong to the requested guild'};
    }
    try {
        const message = await (channel as unknown as { send: (c: string) => Promise<{ id: string }> }).send(req.content);
        return {ok: true, message_id: message.id};
    } catch (err) {
        if (err instanceof DiscordAPIError) {
            if (err.code === 50001 || err.code === 50013) {
                return {ok: false, status: 403, code: 'forbidden', message: err.message};
            }
            return {ok: false, status: 502, code: 'discord_error', message: err.message};
        }
        return {
            ok: false,
            status: 500,
            code: 'internal',
            message: err instanceof Error ? err.message : 'unknown error',
        };
    }
}
