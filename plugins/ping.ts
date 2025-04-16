// ping.ts
import { Plugin } from '../src/plugin';
import {DiscordMessage} from "../src/discord";

export class PingPlugin extends Plugin {
    public plugin_name: string = "com.xalior.ping";

    public async message(discord_message: DiscordMessage, content: string): Promise<void> {
        if (content !== '!ping') return;

        try {
            await discord_message.message.reply('pong!');
        } catch (error) {
            console.error(`Error replying to message: ${error}`);
        }
    }
}
