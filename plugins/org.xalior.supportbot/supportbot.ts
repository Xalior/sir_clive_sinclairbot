// supportbot.ts
import { Plugin } from '../../src/plugin';
import { DiscordMessage } from "../../src/discord";

export class SupportbotPlugin extends Plugin {
    public name: string = "SupportbotPlugin";

    public async messageCreate(discord_message: DiscordMessage): Promise<void> {
        try {
            await discord_message.message.reply('Hello from ExamplePlugin!');
        } catch (error) {
            console.error(`Error replying to message: ${error}`);
        }
    }

}
