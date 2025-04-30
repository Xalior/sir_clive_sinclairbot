// chatbot.ts
import { Plugin } from '../../src/plugin';
import { DiscordMessage } from "../../src/discord";
import {Client} from "discord.js";
import {Express} from "express";

export class ChatbotPlugin extends Plugin {
    constructor(discord_client: Client, express_app: Express) {
        super(discord_client, express_app, "org.xalior.chatbot");
    }

    public async messageCreate(discord_message: DiscordMessage): Promise<void> {
        try {
            await discord_message.message.reply('Hello from ExamplePlugin!');
        } catch (error) {
            console.error(`Error replying to message: ${error}`);
        }
    }

}
