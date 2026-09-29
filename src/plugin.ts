// plugin.ts
import {Client} from 'discord.js';
import {z} from 'zod';
import {client, DiscordAccount, DiscordAccounts, DiscordMessage} from "./discord";
import PersistanceAdapter from "./persistance_adapter";
import {Express} from 'express';
import {plugins as pluginNamespaces} from "../data/plugins";
import {Claim, Claims, registerCsrfSkipPaths} from "./auth";
import {registerPluginEnvSchema, validateAllPluginEnv} from "./plugin_env";

export const plugins: Record<string, Plugin> = {};

// Dynamically load and initialize plugins
export const load_plugins = async (express_app: Express) => {
    type ImportedPlugin = { namespace: string; pluginClass: any };
    const imported: ImportedPlugin[] = [];

    // Pass 1: import every plugin module and collect env schemas.
    for (const namespace of pluginNamespaces) {
        try {
            const pluginName = namespace.split('.').pop() || '';
            const importPath = `../plugins/${namespace}/${pluginName}`;
            const pluginModule = await import(importPath);

            const pluginClass = Object.values(pluginModule).find(
                (exportedItem: any) =>
                    typeof exportedItem === 'function' &&
                    exportedItem.prototype instanceof Plugin
            );

            if (pluginClass) {
                imported.push({namespace, pluginClass});
                if ((pluginClass as typeof Plugin).envSchema) {
                    registerPluginEnvSchema(namespace, (pluginClass as typeof Plugin).envSchema!);
                }
            } else {
                console.error(`No valid plugin class found in ${importPath}`);
            }
        } catch (error) {
            console.error(`🗑️ - Failed to load plugin ${namespace}:`, error);
        }
    }

    // Between passes: check plugin requirements and validate the merged plugin env.
    // Both fail loud, outside try/catch.
    checkPluginRequirements(imported);
    validateAllPluginEnv();

    // Pass 2: construct each plugin and register its CSRF skip-paths.
    for (const {namespace, pluginClass} of imported) {
        try {
            // @ts-ignore - pluginClass is dynamically resolved
            plugins[namespace] = new pluginClass(client, express_app);
            registerCsrfSkipPaths(plugins[namespace].csrfSkipPaths);
            console.log(await plugins[namespace].onLoaded());
        } catch (error) {
            console.error(`🗑️ - Failed to construct plugin ${namespace}:`, error);
        }
    }
};


/**
 * Stop the bot when an imported plugin requires a plugin namespace that was not
 * imported. Checks presence only, not load order.
 */
function checkPluginRequirements(imported: { namespace: string; pluginClass: typeof Plugin }[]): void {
    const loaded = new Set(imported.map(({namespace}) => namespace));
    const missing: string[] = [];
    for (const {namespace, pluginClass} of imported) {
        for (const required of pluginClass.requires ?? []) {
            if (!loaded.has(required)) missing.push(`${namespace} requires ${required}, which is not loaded`);
        }
    }
    if (missing.length > 0) {
        console.error('❌ Missing plugin requirements:');
        for (const line of missing) console.error(`  - ${line}`);
        process.exit(1);
    }
}

/**
 * Get plugin by namespace
 * @param namespace The namespace of the plugin to find
 * @returns The plugin instance or undefined if not found
 */
export function getPlugin(namespace: string): Plugin | undefined {
    return plugins[namespace];
}

export abstract class Plugin {
    static envSchema?: z.ZodObject<any>;
    // Plugin namespaces that must also be in data/plugins.ts for this plugin to load.
    static requires?: string[];

    protected _discord_client: Client;
    protected _plugin_name: string;
    persistance: PersistanceAdapter<any>;
    express_app: Express;
    public csrfSkipPaths: string[] = [];

    protected constructor(discord_client: Client, express_app: Express, plugin_name: string) {
        if (this.constructor === Plugin) {
            throw new Error("Cannot instantiate the abstract class 'Plugin'");
        }

        this._discord_client = discord_client;
        this._plugin_name = plugin_name;
        this.persistance = new PersistanceAdapter<any>(plugin_name);
        this.express_app = express_app;
        
        console.info(`📁 - plugin.loading: ${plugin_name}.${this.constructor.name}`);
    }
    
    public get plugin_name(): string {
        return this._plugin_name;
    }

    public async messageCreate(discord_message: DiscordMessage, config?: any): Promise<void> {
        // If you registered a plugin to receive messages, it best have a proper message handler...
        return this.message(discord_message, discord_message.message.content, config);
    }

    public async messageDirectCreate(discord_message: DiscordMessage): Promise<void> {
        // Silently do nothing on a DM, by default
        return;
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

    protected async getDiscordUser(discord_user_id: string): Promise<DiscordAccount | undefined> {
        console.log("getDiscordUser: ", discord_user_id);
        return DiscordAccounts.get(discord_user_id);
    }

    protected async getClaim(claim_id: string): Promise<Claim | undefined> {
        return Claims.get(claim_id);
    }

    public async onLoaded(): Promise<string> {
        return `📂 - plugin.loaded: ${this.plugin_name}`;
    }
}