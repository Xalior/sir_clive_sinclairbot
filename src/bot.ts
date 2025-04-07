// bot.ts
import { env } from "./env"
// @ts-ignore
import { guilds } from "../data/guilds.js"
import {Client, GatewayIntentBits, Message, OmitPartialGroupDMChannel, TextChannel} from 'discord.js';
import { GuildData } from "./guild";
const { Configuration, OpenAI } = require("openai");


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

client.on('messageCreate', async (message:OmitPartialGroupDMChannel<Message>) => {
    if(guilds[message.guildId]) {
        const guild_data: GuildData = guilds[message.guildId];
        let message_deleted = false;

        // Per Channel
        for (const guild_channel of guild_data.channels) {
            // Correct channel?
            if (message.channelId === guild_channel.channel_id) {
                // by default, all messages pass
                let filters_passed = true;

                if (guild_channel.filters) {
                    // Pre-process text, to speed up filtering
                    const message_text = message.content.toLowerCase();

                    // Filtering
                    try {
                        // Required Terms
                        if (filters_passed && guild_channel.filters.required?.message_begins) {
                            filters_passed = false;
                            guild_channel.filters.required.message_begins.forEach(begins => {
                                if (message_text.startsWith(begins))
                                    filters_passed = true;
                            });
                        }

                        if (filters_passed && guild_channel.filters.required?.message_contains) {
                            filters_passed = false;
                            guild_channel.filters.required.message_contains.forEach(begins => {
                                if (message_text.includes(begins))
                                    filters_passed = true;
                            });
                        }

                        // Banned Terms
                        if (filters_passed && guild_channel.filters.banned?.message_begins) {
                            guild_channel.filters.banned.message_begins.forEach(begins => {
                                if (message_text.startsWith(begins))
                                    filters_passed = false;
                            })
                        }

                        if (filters_passed && guild_channel.filters.banned?.message_contains) {
                            guild_channel.filters.banned.message_contains.forEach(begins => {
                                if (message_text.includes(begins))
                                    filters_passed = false;
                            })
                        }

                        // All filtering done, now deal with results
                        if (filters_passed && guild_channel.pass) {
                            if (guild_channel.pass.message) {
                                message.author.send(await message_expand(message, guild_channel.pass.message));
                            }

                            if (guild_channel.pass.reply) {
                                message.reply(await message_expand(message, guild_channel.pass.reply));
                            }

                            if (guild_channel.pass.expires) {
                                setTimeout(() => {
                                    message.delete();
                                    message_deleted = true;
                                }, guild_channel.pass.expires)
                            }

                            if (guild_channel.pass.emoji) {
                                message.react(guild_channel.pass.emoji);
                            }

                            if (guild_channel.pass.delete) {
                                message.delete();
                                message_deleted = true;
                                message.author.send("Your message was deleted - the original message you sent now follows:\n\n" + message.content);

                            }
                        } else if (!filters_passed && guild_channel.fail) {
                            if (guild_channel.fail.message) {
                                message.author.send(await message_expand(message, guild_channel.fail.message));
                            }

                            if (guild_channel.fail.reply) {
                                message.reply(await message_expand(message, guild_channel.fail.reply));
                            }

                            if (guild_channel.fail.expires) {
                                setTimeout(() => {
                                    message.delete();
                                    message_deleted = true;
                                }, guild_channel.fail.expires)
                            }

                            if (guild_channel.fail.emoji) {
                                message.react(guild_channel.fail.emoji);
                            }

                            if (guild_channel.fail.delete) {
                                message.delete();
                                message_deleted = true;
                                message.author.send("Your message was deleted - the original message you sent now follows:\n\n" + message.content);
                            }
                        }
                    } catch (error: any) {
                        try {
                            (client.channels.cache.get(guild_data.log_channel_id) as TextChannel).send(error as string);
                        } finally {
                            console.error(`ERROR: ${error} on ${message.guildId}.${message.channelId}:{"${message.content}"}`);
                        }
                    }
                } else {
                    console.error(`${message.guildId}.${message.channelId} has no filters!`);
                }
            }
        }

        if (!message_deleted) {
            // Command Processing
            if (message.author.bot) return;

            if (message.content.startsWith(guild_data.command_prefix)) {
                const args = message.content.slice(guild_data.command_prefix.length).trim().split(/ +/);
                const command = args.shift()?.toLowerCase();

                if (command === 'ping') {
                    await message.reply('Pong!');
                }
            }
            else if (message.content.startsWith(`<@${client_id}>`) ||
            message.mentions.repliedUser?.id === client_id) {
                console.log(message);

                const llm = new OpenAI({
                    baseURL: "http://norma.xalior.com/api",
                    apiKey: env.OPENAI_TOKEN,
                });


                let chat = message.content;
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
                    await message.reply(completion.choices[0].message.content);
                }
                catch (error: any) {
                    console.error(error);
                }
            }

        }
    }
});

client.login(env.BOT_TOKEN);