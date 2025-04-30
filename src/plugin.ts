// plugin.ts
import {Client} from 'discord.js';
import {DiscordMessage} from "./discord";
import PersistanceAdapter from "./persistance_adapter";

export abstract class Plugin {
    private client: Client | undefined;
    public plugin_name: string = "";
    private persistance: PersistanceAdapter;

    protected constructor(discord_client: Client) {
        if (this.constructor === Plugin) {
            throw new Error("Cannot instantiate the abstract class 'Plugin'");
        }
        if (discord_client) {
            this.client = discord_client;
        }

        this.persistance = new PersistanceAdapter('this.plugin_name');

        console.info("Creating plugin:", this.constructor.name);
    }

    public async messageCreate(discord_message: DiscordMessage, config?: any): Promise<void> {
        return this.message(discord_message, discord_message.message.content, config);
    }

    public async message(discord_message: DiscordMessage, message_content: string, config?: any): Promise<void> {
        throw (Error(`You can't send messages to the default base plugin`));
    }

    public unregister(): void {
        console.info(`Unregistering Class ${this.constructor.name} as Plugin ${this.plugin_name}`);
    }
}