import fs from 'node:fs';
import {client} from './discord.ts';

// The bot's name, as its Discord profile shows it. It is known once the bot has logged in.
export const botName = (): string => client.user?.displayName ?? '';

// Reads a plugin's response text, and puts the bot's name in place of <BOT_NAME>.
export const readResponse = (file: string): string =>
    fs.readFileSync(file, 'utf8').split('<BOT_NAME>').join(botName());
