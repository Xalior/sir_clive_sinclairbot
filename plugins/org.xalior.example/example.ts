// exampleplugin.ts
import { Plugin } from '../../src/plugin';
import {DiscordMessage} from "../../src/discord";


// An example Sir.Clive plugin, that replies to messages
export class Example extends Plugin {
    public plugin_name: string = "org.xalior.example";

    public async message(discord_message: DiscordMessage, message_content: string, config?: any): Promise<void> {
        try {
            const now = new Date();

            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            if (config.message) {
                await discord_message.message.reply(`Replied "${config.message}" at ${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
            } else {
                await discord_message.message.reply(`Replied at ${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
            }
        } catch (error) {
            console.error(`Error replying to message: ${error}`);
        }
    }
}
