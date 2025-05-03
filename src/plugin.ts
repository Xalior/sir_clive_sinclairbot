// plugin.ts
import {Client} from 'discord.js';
import {client, DiscordMessage} from "./discord";
import PersistanceAdapter from "./persistance_adapter";
import {Express} from 'express';
import {plugins as pluginNamespaces} from "../data/plugins";
import {Claim, Claims} from "./auth";

export const plugins: Record<string, Plugin> = {};


export interface DiscordUser {
    claim_id: string;
    discord_id: string;
}


export const DiscordUsers = new PersistanceAdapter<DiscordUser>('discord_user');

// Dynamically load and initialize plugins
export const load_plugins = async (app: Express) => {
    for (const namespace of pluginNamespaces) {
        try {
            // Extract the plugin name from the namespace (last part after dot)
            const pluginName = namespace.split('.').pop() || '';
            // Create the import path
            const importPath = `../plugins/${namespace}/${pluginName}`;

            // Dynamically import the plugin module
            const pluginModule = await import(importPath);

            // Find the plugin class - it's usually named with 'Plugin' suffix
            const pluginClass = Object.values(pluginModule).find(
                (exportedItem: any) =>
                    typeof exportedItem === 'function' &&
                    exportedItem.prototype instanceof Plugin
            );

            if (pluginClass as Plugin) {
                // Initialize the plugin with the Discord client
                plugins[namespace] = new pluginClass(client);
                console.log(`plugin.loaded: ${namespace}`);
            } else {
                console.error(`No valid plugin class found in ${importPath}`);
            }
        } catch (error) {
            console.error(`Failed to load plugin ${namespace}:`, error);
        }
    }
};


/**
 * Get plugin by namespace
 * @param namespace The namespace of the plugin to find
 * @returns The plugin instance or undefined if not found
 */
export function getPlugin(namespace: string): Plugin | undefined {
    return plugins[namespace];
}

export abstract class Plugin {
    private client: Client | undefined;
    private _plugin_name: string;
    persistance: PersistanceAdapter<any>;
    express_app: Express;

    protected constructor(discord_client: Client, express_app: Express, plugin_name: string) {
        if (this.constructor === Plugin) {
            throw new Error("Cannot instantiate the abstract class 'Plugin'");
        }

        this.client = discord_client;
        this._plugin_name = plugin_name;
        this.persistance = new PersistanceAdapter<any>(plugin_name);
        this.express_app = express_app;
        
        console.info(`plugin.loading: ${plugin_name}.${this.constructor.name}`);
    }
    
    public get plugin_name(): string {
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

    // DIV containing summary of widget, shown to anonymous users
    public async getWidget(req: Request):Promise<string> {
        return "";
    }

    // DIV containing summary of widget, shown to authenticated users
    public async getSecureWidget(req: Request):Promise<string> {
        return "";
    }

    // Nested <UL> block, inserted into top NAVBAR,and turned into dropdowns
    public async getNavblock(req: Request):Promise<string> {
        return "";
    }

    // Nested <UL> block, inserted into top NAVBAR,and turned into dropdowns
    public async getSecureNavblock(req: Request):Promise<string> {
        return "";
    }

    protected async getDiscordUser(discord_message: DiscordMessage): Promise<DiscordUser> {
        return DiscordUsers.get(discord_message.message.author.id);
    }

    protected async getClaim(claim_id: string): Promise<Claim> {
        return Claims.get(claim_id);
    }
}