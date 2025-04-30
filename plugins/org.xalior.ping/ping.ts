// ping.ts
import { Plugin } from '../../src/plugin';
import {DiscordMessage} from "../../src/discord";

export class PingPlugin extends Plugin {
    public plugin_name: string = "org.xalior.ping";

    public async message(discord_message: DiscordMessage, message_content: string, config?: any): Promise<void> {
        if (message_content !== '!ping') return;

        try {
            const data = (await this.persistance.find('pingcounter')) || { };

            const guildId = discord_message.message.guildId as string;
            if(data[guildId] == undefined) {
                data[guildId] = { count: 0 };
            }

            data[guildId].count++;

            console.log(discord_message.message);

            await this.persistance.upsert('pingcounter', data);

            await discord_message.message.reply(`I've ponged ${data[guildId].count} time${data[guildId].count > 1 ? 's' : ''}!`);
        } catch (error) {
            console.error(`Error replying to ping: ${error}`);
        }
    }
}
