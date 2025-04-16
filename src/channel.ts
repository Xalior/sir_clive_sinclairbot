interface ChannelFilterList {
    message_begins?: string[];
    message_contains?: string[];
}

interface ChannelFilters {
    required?: ChannelFilterList;
    banned?: ChannelFilterList;
    all?: boolean;
}

interface ChannelFilterActions {
    message?: string;
    reply?: string;
    expires?: number;
    emoji?: string;
    log?: boolean;
    plugin?: Array<string>
    delete?: boolean;
}

class ChannelFilterActionReport {
    message: string | undefined = undefined;
    reply: string | undefined = undefined;
    expires: number | undefined = undefined;
    emoji: string | undefined = undefined;
    plugins_triggered: string = "";
    delete: boolean = false;
}

interface ChannelData {
    channel_id: string;
    filters?: ChannelFilters
    pass?: ChannelFilterActions,
    fail?: ChannelFilterActions
}


export { ChannelData, ChannelFilters, ChannelFilterList, ChannelFilterActions, ChannelFilterActionReport }