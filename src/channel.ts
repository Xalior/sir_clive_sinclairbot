
// Fake enums, that don't hurt transpiled typescript as much!

interface ChannelData {
    channel_id: string;
    filters: {
        required: {
            message_begins: string[] | null,
            message_contains: string[] | null,
        }
        banned: {
            message_begins: string[] | null,
            message_contains: string[] | null,
        }
    }
    pass: {
        delete: Boolean;
        message: string|null;
        reply: string|null;
        expires: number|null;
        emoji: string|null;
    },
    fail: {
        delete: Boolean;
        message: string|null;
        reply: string|null;
        expires: number|null;
        emoji: string|null;
    }
}


export { ChannelData }