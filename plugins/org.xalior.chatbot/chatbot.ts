// chatbot.ts
import { Plugin } from '../../src/plugin';
import { client_id, DiscordMessage } from "../../src/discord";
import {Client} from "discord.js";
import {Express} from "express";
import {env} from "../../src/env";
import OpenAI from 'openai';
import {ChatCompletionMessageParam} from "openai/src/resources/chat/completions/completions";

const client = new OpenAI({
    baseURL: 'http://norma.xalior.com/api/',
    apiKey: env.OPENAI_TOKEN
});

class PriorConversation {
    messages: Array<ChatCompletionMessageParam> = new Array<ChatCompletionMessageParam>();
}
const MAX_CONTEXT_LENGTH = 20;
const MAX_RESPONSE_TOKENS = 1024;

export class ChatbotPlugin extends Plugin {
    constructor(discord_client: Client, express_app: Express) {
        super(discord_client, express_app, "org.xalior.chatbot");
    }

    public async messageCreate(discord_message: DiscordMessage): Promise<void> {
        try {
            // Is the message addressed to the bot?
            if(discord_message.message.mentions.users.get(client_id)) {
                const prior_conversation = (
                    await this.persistance.find(discord_message.message.author.id) as PriorConversation
                ) || new PriorConversation();

                // Store the latest message from the user
                prior_conversation['messages'].push({
                    role: 'user',
                    content: discord_message.message.content
                });

                // If they conversation gets too long, truncate it
                while(prior_conversation['messages'].length > MAX_CONTEXT_LENGTH) {
                    prior_conversation['messages'].shift();
                }

                let llmMessages:Array<ChatCompletionMessageParam> = Object.assign([], prior_conversation['messages']);

                const completion = await client.chat.completions.create({
                    model: 'sir_clive_sinclairbot:latest',
                    messages: llmMessages,
                });

                console.log(completion);

                prior_conversation.messages.push({
                    role: 'assistant',
                    content: completion.choices[0].message.content,
                })

                await this.persistance.upsert(discord_message.message.author.id, prior_conversation);
                await discord_message.message.reply(completion.choices[0].message.content as string);
            };
        } catch (error) {
            console.log(error);
            console.error(`Error replying to message: ${error}`);
        }
    }

}
