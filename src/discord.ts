
import {Client, GatewayIntentBits, Message, OmitPartialGroupDMChannel, TextChannel} from 'discord.js';
import {ChannelFilterActionReport} from "./channel";
import {GuildData} from "./guild";


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

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

export {client, DiscordMessage};