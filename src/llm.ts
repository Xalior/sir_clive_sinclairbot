import {Message, OmitPartialGroupDMChannel} from "discord.js";
import {ChannelFilterActions} from "./channel";

interface LLMCommands {
    'macro': string;
    'message': string;
}

interface LLMOptions {
    model: string;
    commands?: LLMCommands;
    actions: ChannelFilterActions
}

async function process(incoming_message: OmitPartialGroupDMChannel<Message>, actions: LLMOptions): Promise<boolean> {
    let message = incoming_message.content;

    // message?: string;
    // reply?: string;
    // expires?: number;
    // emoji?: string;
    // llm?: LLMOptions;
    // delete?: Boolean;

    return true;
}
export { LLMOptions, process }