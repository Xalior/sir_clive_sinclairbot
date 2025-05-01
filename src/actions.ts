import {Message, OmitPartialGroupDMChannel, TextChannel} from "discord.js";
import {ChannelFilterActions, ChannelFilterActionReport} from "./channel";
import {DiscordMessage} from "./discord";
import {plugins} from "./plugin";

async function message_expand(message: OmitPartialGroupDMChannel<Message>, template:string): Promise<string> {
    const channel = await message.guild?.channels.fetch(message.channelId);
    const guild = await message.guild?.fetch();

    if(channel) template = template.replace("<CHANNEL_NAME>", channel.name);
    if(guild) template = template.replace("<GUILD_NAME>", guild.name);

    return template;
}

function action_report(action_report:ChannelFilterActionReport):string {
    let action_log = "";

    if(action_report.message) action_log = action_log + `### Direct Message\n ${action_report.message}\n\n`;
    if(action_report.reply) action_log = action_log + `### Reply\n ${action_report.reply}\n\n`;
    if(action_report.expires) action_log = action_log + `### Delete Scheduled\n ${action_report.expires} seconds\n\n`;
    if(action_report.emoji) action_log = action_log + `### Reaction Appled\n ${action_report.emoji}\n\n`;
    if(action_report.plugins_triggered) action_log = action_log + `### Plugins Triggered\n${action_report.plugins_triggered}\n\n`;
    if(action_report.delete) action_log = action_log + `### Final Result\n Message Deleted ♻️\n\n`

    if (action_log) action_log = `## Action Report\n\n${action_log}`;

    return action_log;
}

async function action(incoming: DiscordMessage, actions: ChannelFilterActions | undefined) {
    if(!actions) return false;

    try {
        if (actions.message) {
            await incoming.message.author.send(await message_expand(incoming.message, actions.message));
            incoming.action_report.message = actions.message;
        }

        if (actions.reply) {
            await incoming.message.reply(await message_expand(incoming.message, actions.reply));
            incoming.action_report.reply = actions.reply;
        }

        if (actions.expires) {
            const timeout = actions.expires*1000
            setTimeout(() => {
                incoming.message.delete();
                incoming.deleted = true;
            }, actions.expires*1000)
            incoming.action_report.expires = timeout;
        }

        if (actions.emoji) {
            await incoming.message.react(actions.emoji);
            incoming.action_report.emoji = actions.emoji;
        }

        if (actions.plugin) {
            for(const this_plugin in actions.plugin) {
                if(plugins[this_plugin]) {
                    // await, plugins run serially, not parallel!
                    await plugins[this_plugin].messageCreate(incoming, actions.plugin[this_plugin]);
                    incoming.action_report.plugins_triggered = incoming.action_report.plugins_triggered + ` * ${this_plugin}\n`;
                } else {
                    console.warn(`Plugin ${this_plugin} triggered by action, but is not loaded`);
                }
            }
        }

        // Even if we think you should log, the action needs to be confirmed by the config file
        if (actions.log) {
            let log_message = `# Message found in <#${incoming.message.channelId}>\n\n`;

            log_message = log_message + action_report(incoming.action_report)

            log_message = log_message + `## Original Message, by <@${incoming.message.author.id}>

            ${incoming.message.content}`;
            await (incoming.client.channels.cache.get(incoming.guild_data.log_channel_id) as TextChannel).send(log_message as string);
        }

        // Do this last, because not all actions are available after a message is deleted...
        if (!incoming.deleted && actions.delete) {
            await incoming.message.delete();
            incoming.deleted = true;
            await incoming.message.author.send(`Your message was deleted - the original message you sent now follows:
             
             ${incoming.message.content}`);
            incoming.action_report.delete = true;
        }
    } catch (error) {
        console.log("Action Error:", error);
    }
}

export { message_expand, action, action_report }