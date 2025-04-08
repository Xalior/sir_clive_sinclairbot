interface ChannelFilterList {
    message_begins: string[];
    message_contains: string[];
}

interface ChannelFilters {
    required: ChannelFilterList;
    banned: ChannelFilterList;
}

interface ChannelFilterActions {
    delete: Boolean;
    message: string|undefined;
    reply: string|undefined;
    expires: number|undefined;
    emoji: string|undefined;
}

interface ChannelData {
    channel_id: string;
    filters: ChannelFilters
    pass: ChannelFilterActions,
    fail: ChannelFilterActions
}


export { ChannelData, ChannelFilters, ChannelFilterList, ChannelFilterActions }