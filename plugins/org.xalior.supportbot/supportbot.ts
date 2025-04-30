// supportbot.ts
import { Plugin } from '../../src/plugin';
import { DiscordMessage } from "../../src/discord";
import {Client} from "discord.js";

export class SupportbotPlugin extends Plugin {
    constructor(discord_client: Client) {
        super(discord_client, "org.xalior.supportbot");
    }

    public async messageCreate(discord_message: DiscordMessage): Promise<void> {
        try {
            await discord_message.message.reply('Hello from ExamplePlugin!');
        } catch (error) {
            console.error(`Error replying to message: ${error}`);
        }
    }

}
