// bot.ts
import { env } from "./env"
// @ts-ignore
import { guilds } from "../data/guilds.js"
import { GatewayIntentBits, Message, OmitPartialGroupDMChannel, TextChannel} from 'discord.js';
import { client, DiscordMessage } from './discord';
import { GuildData } from "./guild";
import { filter } from "./filters";
import {action} from "./actions";
import {plugins} from "./plugin";
let client_id: string | undefined;

for (const plugin of plugins) {
    console.log("Loaded:",plugin.persistance.model);
}

client.once('ready', () => {
    console.info(`Discord Connection Established -- user: ${client.user?.tag}!`);

    client_id = client.user?.id;
});

client.on('messageCreate', async (discord_message:OmitPartialGroupDMChannel<Message>) => {
    // Don't respond to automated messages
    if (discord_message.author.bot) return;

    // Filter message by server (guild)
    if(guilds[discord_message.guildId]) {

        // Create our own state-managed version of the incoming message
        const incoming = new DiscordMessage(client, guilds[discord_message.guildId], discord_message);

        // Per Channel
        for (const guild_channel of incoming.guild_data.channels) {
            // Correct channel?
            if (incoming.message.channelId === guild_channel.channel_id ||
            (guild_channel.channel_id === '*')) {

                // Required Terms
                let required_filters = filter(incoming, guild_channel.filters?.required);

                // Banned Terms
                let banned_filters = filter(incoming, guild_channel.filters?.banned);

                // Anything can fail in the action, to we best wrap it...
                try {
                    // All filtering done, now deal with results - which filters depends on the results of both sets...
                    await action(incoming, (guild_channel.filters?.all ||  (required_filters && !banned_filters)) ? guild_channel.pass : guild_channel.fail);
                }
                catch (error: any) {
                    try {
                        await (client.channels.cache.get(incoming.guild_data.log_channel_id) as TextChannel).send(error as string);
                    }
                    finally {
                        console.error(`ERROR: ${error} on ${incoming.message.guildId}.${incoming.message.channelId}:{"${incoming.message.content}"}`);
                    }
                }
            }
        }
    }
});

client.login(env.BOT_TOKEN);