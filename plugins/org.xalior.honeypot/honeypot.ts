// honeypot.ts
import { Plugin } from '../../src/plugin';
import { DiscordMessage } from "../../src/discord";
import { Client, PermissionFlagsBits } from "discord.js";
import { Express } from "express";

// Discord's hard ceiling on a member timeout
const MAX_TIMEOUT_MINUTES = 28 * 24 * 60;
const DEFAULT_TIMEOUT_MINUTES = 24 * 60;

// Mutes anyone who posts in the channel this plugin is attached to.
// Config (per-channel, via the plugin action in data/guilds.js):
//   timeout_minutes: how long to mute for (default 1 day, capped at Discord's 28-day max)
// Channel selection, logging and message deletion are the standard per-channel
// action flags (channel_id, log, delete) — not plugin config.
export class HoneypotPlugin extends Plugin {
    constructor(discord_client: Client, express_app: Express) {
        super(discord_client, express_app, "org.xalior.honeypot");
    }

    public async message(discord_message: DiscordMessage, message_content: string, config?: any): Promise<void> {
        const member = discord_message.message.member;
        if (!member) return;

        // Staff are exempt — a moderator posting in the trap must not self-mute
        if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            discord_message.action_report.plugins_triggered += `   * honeypot: ${member.user.tag} is staff, not muted\n`;
            return;
        }

        const timeout_minutes = Math.min(config?.timeout_minutes ?? DEFAULT_TIMEOUT_MINUTES, MAX_TIMEOUT_MINUTES);

        // A failed mute must not throw: the log and delete actions run after this
        // plugin in the same try-block, and the trap still wants the message gone.
        try {
            await member.timeout(timeout_minutes * 60_000, `Posted in honeypot channel`);
            discord_message.action_report.plugins_triggered += `   * honeypot: muted ${member.user.tag} for ${timeout_minutes}m\n`;
        } catch (error) {
            discord_message.action_report.plugins_triggered += `   * honeypot: FAILED to mute ${member.user.tag} — ${error}\n`;
        }
    }
}
