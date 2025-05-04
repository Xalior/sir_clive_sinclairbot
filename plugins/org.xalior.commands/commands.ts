// ping.ts
import { Plugin } from '../../src/plugin';
import {client_id, DiscordAccounts, DiscordMessage} from "../../src/discord";
import packageJson from "../../package.json"
import {Client} from "discord.js";
import {Express} from "express";
import fs from "node:fs";
import {env} from "../../src/env";
import {ensureAuthenticated, Verification, Verifications} from "../../src/auth";
import { v4 as uuidv4 } from 'uuid';

const startup_time = new Date();

function formatDuration(ms: number): string {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    let formattedDuration = '';

    if (days > 0) {
        formattedDuration += `${days}d `;
    }
    if (hours > 0) {
        formattedDuration += `${hours}h `;
    }
    if (minutes > 0) {
        formattedDuration += `${minutes}m `;
    }
    if (seconds > 0 || formattedDuration === '') {
        formattedDuration += `${seconds}s`;
    }

    return formattedDuration.trim();
}

export class CommandManager extends Plugin {
    constructor(discord_client: Client, express_app: Express) {
        express_app.get('/u/:uuid', ensureAuthenticated, async (req, res) => {
            console.log("PARAMS:", req.params.uuid);

            const verification_code = await Verifications.get(req.params.uuid);
            if(!verification_code) return res.sendStatus(404);
            console.log("VERIFICATION CODE:", verification_code);

            let discord_account = await this.getDiscordUser(verification_code.discord_id);
            if(!discord_account) {
                discord_account = {
                    discord_id: verification_code.discord_id,
                    claim_id: '',
                }
            }

            discord_account.claim_id = req.user.me.sub;

            await DiscordAccounts.upsert(discord_account.discord_id, discord_account);
            Verifications.destroy(verification_code.verification_id);
            this._discord_client.users.send(discord_account.discord_id, 'Your discord account has been linked to your Sir.Clive Sinclairbot account.');

            return res.send('Account Linked');
        })
        super(discord_client, express_app,"org.xalior.commands");
    }

    public async messageCreate(discord_message: DiscordMessage, config?: any): Promise<void> {
        return this.message(discord_message, discord_message.message.content, config);
    }

    public async messageDirectCreate(discord_message: DiscordMessage): Promise<void> {
        return this.message(discord_message, discord_message.message.content);
    }

    public async message(discord_message: DiscordMessage, content: string, config?: any): Promise<void> {
        return this.execute_command(discord_message);
    }

    private async execute_command(discord_message: DiscordMessage) : Promise<void> {
        const content = discord_message.message.content // Take the message content
            .replace('<@' + client_id + '>', '') // Remove any mentions of the bot
            .trim(); // Remove any leading or trailing whitespace

        if (!content.startsWith('!')) return;

        const command = content.split(' ')[0].toLowerCase();
        const args = content.split(' ').slice(1);
        switch (command) {
            case '!help':
                await discord_message.message.author.send(fs.readFileSync('./plugins/org.xalior.commands/responses/help.md', 'utf8'));
                await discord_message.message.react('🤖')
                break;
            case "!ping":
                await discord_message.message.reply('pong!');
                break;
            case "!uptime":
                const elapsedTime = new Date().getTime() - startup_time.getTime();
                await discord_message.message.reply(`Uptime: ${formatDuration(elapsedTime)}`);
                break;
            case "!version":
                await discord_message.message.reply(`Sir. Clive Sinclairbot - version ${packageJson.version}
More Details: ${packageJson.homepage}
Bugs: ${packageJson.bugs.url}`);
                break;
            case "!register":
                console.log(discord_message.message.author.id);
                let discord_user = await this.getDiscordUser(discord_message.message.author.id);

                console.log("DISCORD USER:", discord_user);
                // Part 1, the discord user exists...
                if(discord_user?.claim_id) {
                    await discord_message.message.reply(`You are already registered, visit https://${env.HOSTNAME}/me to see your account.`);
                    return;
                }
                const verification:Verification = {
                    verification_id: uuidv4(),
                    discord_id: discord_message.message.author.id,
                }

                // Store the verification code, but only for 15minutes - this should give enough time to join NBN if not a member already
                Verifications.upsert(verification.verification_id, verification, 15 * 60);
                await discord_message.message.reply(`Visit https://${env.HOSTNAME}/u/${verification.verification_id} complete your registration.`);

                break;
        }
    }
}
