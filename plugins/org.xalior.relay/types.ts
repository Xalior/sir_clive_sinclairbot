export type RelayErrorCode =
    | 'missing_headers'
    | 'invalid_body'
    | 'bad_signature'
    | 'stale_timestamp'
    | 'replayed_nonce';

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
