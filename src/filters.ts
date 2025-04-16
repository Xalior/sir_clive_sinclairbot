import {ChannelFilterActions, ChannelFilterList, ChannelFilters} from "./channel";
import {DiscordMessage} from "./discord";

function filter_expand(filters:string[]) {

}

function filter(incoming: DiscordMessage, filters: ChannelFilterList | undefined):boolean {
    if(filters) {

        const message_text = incoming.message.content.toLowerCase();

        if (filters.message_begins && filters.message_begins.some(begins => message_text.startsWith(begins))) {
            return true;
        }
        if (filters.message_contains && filters.message_contains.some(contains => message_text.includes(contains))) {
            return true;
        }
    }
    return false;
}

export { filter_expand, filter }