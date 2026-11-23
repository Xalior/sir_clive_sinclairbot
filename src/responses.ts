import fs from 'node:fs';
import {Message} from 'discord.js';
import {client} from './discord.ts';

// The bot's name, as its Discord profile shows it. It is known once the bot has logged in.
export const botName = (): string => client.user?.displayName ?? '';

// Reads a plugin's response text, and puts the bot's name in place of <BOT_NAME>.
export const readResponse = (file: string): string =>
    fs.readFileSync(file, 'utf8').split('<BOT_NAME>').join(botName());

// The reaction when Discord refuses a DM to the author of a message.
export const DM_REFUSED_REACTION = '❗';

// Sends the author of a message a DM, then reacts to the message with sentReaction.
// Discord refuses the DM when the author does not take DMs from the server. Then the
// reaction is DM_REFUSED_REACTION, so the author can see that the DM did not arrive.
export const dmAuthor = async (message: Message, text: string, sentReaction: string): Promise<void> => {
    try {
        await message.author.send(text);
    } catch (error) {
        console.error(`DM to ${message.author.id} refused:`, error instanceof Error ? error.message : error);
        await message.react(DM_REFUSED_REACTION);
        return;
    }
    await message.react(sentReaction);
};
