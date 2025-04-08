import {Message, OmitPartialGroupDMChannel} from "discord.js";
import {ChannelFilters} from "./channel";

function filter_expand(filters:string[]) {

}

function filter(message: OmitPartialGroupDMChannel<Message>, filters:ChannelFilters):boolean {
    let filters_passed = true;

    // Pre-process text, to speed up filtering
    const message_text = message.content.toLowerCase();

    // Filtering
    try {
        // Required Terms
        if (filters_passed && filters.required?.message_begins) {
            // Any one matching will do, so mark as failed to start
            filters_passed = false;
            filters.required.message_begins.forEach(begins => {
                if (message_text.startsWith(begins))
                    filters_passed = true;
            });
        }

        if (filters_passed && filters.required?.message_contains) {
            // Any one matching will do, so mark as failed to start
            filters_passed = false;
            filters.required.message_contains.forEach(begins => {
                if (message_text.includes(begins))
                    filters_passed = true;
            });
        }

        // Banned Terms
        if (filters_passed && filters.banned?.message_begins) {
            filters.banned.message_begins.forEach(begins => {
                if (message_text.startsWith(begins))
                    filters_passed = false;
            })
        }

        if (filters_passed && filters.banned?.message_contains) {
            filters.banned.message_contains.forEach(begins => {
                if (message_text.includes(begins))
                    filters_passed = false;
            })
        }
    } catch (error) {
        
    }
    return filters_passed;
}

export { filter_expand, filter }