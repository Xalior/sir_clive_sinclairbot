export type RelayErrorCode =
    | 'missing_headers'
    | 'invalid_body'
    | 'bad_signature'
    | 'stale_timestamp'
    | 'replayed_nonce'
    | 'channel_not_found'
    | 'channel_not_text'
    | 'wrong_guild'
    | 'forbidden'
    | 'discord_error'
    | 'internal';

export interface RelaySendSuccess {
    ok: true;
    message_id: string;
}

export interface RelaySendError {
    ok: false;
    error: {
        code: RelayErrorCode;
        message: string;
    };
}

export type RelaySendResponse = RelaySendSuccess | RelaySendError;
