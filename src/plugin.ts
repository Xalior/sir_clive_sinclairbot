// plugin.ts
import {Client} from 'discord.js';
import {DiscordMessage} from "./discord";
import PersistanceAdapter from "./persistance_adapter";

export const plugins: Array<Plugin> = [];


export abstract class Plugin {
    private client: Client | undefined;
    private _plugin_name: string;
    persistance: PersistanceAdapter;

    protected constructor(discord_client: Client, plugin_name: string) {
        if (this.constructor === Plugin) {
            throw new Error("Cannot instantiate the abstract class 'Plugin'");
        }

        this.client = discord_client;
        this._plugin_name = plugin_name;
        this.persistance = new PersistanceAdapter(plugin_name);
        
        console.info(`Creating plugin: ${this.constructor.name} with name: ${plugin_name}`);
        plugins.push(this);
    }
    
    protected get plugin_name(): string {
        return this._plugin_name;
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