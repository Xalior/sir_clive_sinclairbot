import {Client, GatewayIntentBits, Message, OmitPartialGroupDMChannel, Partials} from 'discord.js';
import {ChannelFilterActionReport} from "./channel";
import {GuildData} from "./guild";
import PersistanceAdapter from "./persistance_adapter";

let client_id: string;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction
    ]
});

export interface DiscordAccount {
    claim_id: string;
    discord_id: string;
}

export const DiscordAccounts = new PersistanceAdapter<DiscordAccount>('discord_accounts');

export const findDiscordAccount = async (discord_user_id: string) => {
    return await DiscordAccounts.get(discord_user_id);
}

class DiscordMessage {
    // passed in at creation
    client: Client;
    guild_data: GuildData;
    message: OmitPartialGroupDMChannel<Message>;

    // register what actions run, for logging
    action_report: ChannelFilterActionReport;

    // flags
    deleted: boolean = false;

    constructor(client: Client, guild_data: GuildData, message: OmitPartialGroupDMChannel<Message>) {
        this.client = client;
        this.guild_data = guild_data;
        this.message = message;

        this.action_report = new ChannelFilterActionReport();
    }
}

export {client, client_id, DiscordMessage};

client.once('ready', () => {
    console.info(`✅ Discord connected -- user: \`${client.user?.tag}\`, id: ${client.user?.id}`);
    client_id = client.user?.id as string;
});