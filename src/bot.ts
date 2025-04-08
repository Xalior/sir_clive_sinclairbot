// bot.ts
import { env } from "./env"
// @ts-ignore
import { guilds } from "../data/guilds.js"
import {Client, GatewayIntentBits, Message, OmitPartialGroupDMChannel, TextChannel} from 'discord.js';
import { GuildData } from "./guild";
import { filter } from "./filter";

const { OpenAI } = require("openai");



const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

let client_id: string | undefined;
client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    console.log(client.user, client);

    client_id = client.user?.id;
});

async function message_expand(message: OmitPartialGroupDMChannel<Message>, template:string): Promise<string> {
    const channel = await message.guild?.channels.fetch(message.channelId);
    const guild = await message.guild?.fetch();

    if(channel) template = template.replace("<CHANNEL_NAME>", channel.name);
    if(guild) template = template.replace("<GUILD_NAME>", guild.name);

    return template;
}

client.on('messageCreate', async (imcoming_message:OmitPartialGroupDMChannel<Message>) => {
    if(guilds[imcoming_message.guildId]) {
        const guild_data: GuildData = guilds[imcoming_message.guildId];
        let message_deleted = false;

        // Per Channel
        for (const guild_channel of guild_data.channels) {
            // Correct channel?
            if (imcoming_message.channelId === guild_channel.channel_id) {
                // by default, all messages pass
                let filters_passed = true;

                if (guild_channel.filters) {
                    filters_passed = filter(imcoming_message, guild_channel.filters);
                }

                try {
                    // All filtering done, now deal with results
                    if (filters_passed && guild_channel.pass) {
                        if (guild_channel.pass.message) {
                            imcoming_message.author.send(await message_expand(imcoming_message, guild_channel.pass.message));
                        }

                        if (guild_channel.pass.reply) {
                            imcoming_message.reply(await message_expand(imcoming_message, guild_channel.pass.reply));
                        }

                        if (guild_channel.pass.expires) {
                            setTimeout(() => {
                                imcoming_message.delete();
                                message_deleted = true;
                            }, guild_channel.pass.expires)
                        }

                        if (guild_channel.pass.emoji) {
                            imcoming_message.react(guild_channel.pass.emoji);
                        }

                        if (guild_channel.pass.delete) {
                            imcoming_message.delete();
                            message_deleted = true;
                            imcoming_message.author.send("Your message was deleted - the original message you sent now follows:\n\n" + imcoming_message.content);

                        }
                    }
                    else if (!filters_passed && guild_channel.fail) {
                        if (guild_channel.fail.message) {
                            imcoming_message.author.send(await message_expand(imcoming_message, guild_channel.fail.message));
                        }

                        if (guild_channel.fail.reply) {
                            imcoming_message.reply(await message_expand(imcoming_message, guild_channel.fail.reply));
                        }

                        if (guild_channel.fail.expires) {
                            setTimeout(() => {
                                imcoming_message.delete();
                                message_deleted = true;
                            }, guild_channel.fail.expires)
                        }

                        if (guild_channel.fail.emoji) {
                            imcoming_message.react(guild_channel.fail.emoji);
                        }

                        if (guild_channel.fail.delete) {
                            imcoming_message.delete();
                            message_deleted = true;
                            imcoming_message.author.send("Your message was deleted - the original message you sent now follows:\n\n" + imcoming_message.content);
                        }
                    }
                }
                catch (error: any) {
                    try {
                        (client.channels.cache.get(guild_data.log_channel_id) as TextChannel).send(error as string);
                    }
                    finally {
                        console.error(`ERROR: ${error} on ${imcoming_message.guildId}.${imcoming_message.channelId}:{"${imcoming_message.content}"}`);
                    }
                }
            }
        }

        if (!message_deleted) {
            // Command Processing
            if (imcoming_message.author.bot) return;

            if (imcoming_message.content.startsWith(guild_data.command_prefix)) {
                const args = imcoming_message.content.slice(guild_data.command_prefix.length).trim().split(/ +/);
                const command = args.shift()?.toLowerCase();

                if (command === 'ping') {
                    await imcoming_message.reply('Pong!');
                }
            }
            else if (imcoming_message.content.startsWith(`<@${client_id}>`) ||
                    imcoming_message.mentions.repliedUser?.id === client_id) {
                console.log(imcoming_message);

                const llm = new OpenAI({
                    baseURL: "http://norma.xalior.com/api",
                    apiKey: env.OPENAI_TOKEN,
                });


                let chat = imcoming_message.content;
                let messages: any[] = [];

                // if (chat.startsWith(`<@${client_id}>`)) {
                //     chat = chat.substring(`<@${client_id}>`.length);
                // } else {
                //     messages.push({
                //         role: 'user',
                //         content: ''
                //     })
                // }

                messages.push({
                    role: 'user',
                    content: chat,
                })
                try {
                    const completion = await llm.chat.completions.create({
                        model: 'sir_clive_sinclairbot:latest',
                        max_tokens: 200,
                        stream: false,
                        messages: messages,
                    });
                    await imcoming_message.reply(completion.choices[0].message.content);
                }
                catch (error: any) {
                    console.error(error);
                }
            }

        }
    }
});

client.login(env.BOT_TOKEN);