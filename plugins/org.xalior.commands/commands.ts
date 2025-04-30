// ping.ts
import { Plugin } from '../../src/plugin';
import {DiscordMessage} from "../../src/discord";
import packageJson from "../../package.json"
import {Client} from "discord.js";
import {Express} from "express";

const startup_time = new Date();

function formatDuration(ms: number): string {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    let formattedDuration = '';

    if (days > 0) {
        formattedDuration += `${days}d `;
    }
    if (hours > 0) {
        formattedDuration += `${hours}h `;
    }
    if (minutes > 0) {
        formattedDuration += `${minutes}m `;
    }
    if (seconds > 0 || formattedDuration === '') {
        formattedDuration += `${seconds}s`;
    }

    return formattedDuration.trim();
}

export class CommandManager extends Plugin {
    constructor(discord_client: Client, express_app: Express) {
        super(discord_client, express_app,"org.xalior.commands");
    }

    public async messageCreate(discord_message: DiscordMessage, config?: any): Promise<void> {
        // Commands silently fail if they come from a discord bot.
        if(discord_message.message.author.bot) return;
        return this.message(discord_message, discord_message.message.content, config);
    }

    public async message(discord_message: DiscordMessage, content: string, config?: any): Promise<void> {
        console.log(content);
        try {
            switch(content) {
                case "!ping":
                    await discord_message.message.reply('pong!');
                    return;
                case "!uptime":
                    const elapsedTime = new Date().getTime() - startup_time.getTime();
                    await discord_message.message.reply(`Uptime: ${formatDuration(elapsedTime)}`);
                    return;
                case "!version":
                    await discord_message.message.reply(`Sir. Clive Sinclairbot - version ${packageJson.version}
More Details: ${packageJson.homepage}
Bugs: ${packageJson.bugs.url}`);
                    return;
            }
        } catch (error) {
            console.error(`Error replying to message: ${error}`);
        }
    }
}
