// chatbot.ts
import { Plugin } from '../src/plugin';
import { DiscordMessage } from "../src/discord";

export class ChatbotPlugin extends Plugin {
    public name: string = "chat.llm.specnext.dev";

    public async messageCreate(discord_message: DiscordMessage): Promise<void> {
        try {
            await discord_message.message.reply('Hello from ExamplePlugin!');
        } catch (error) {
            console.error(`Error replying to message: ${error}`);
        }
    }

}
