// bot.ts
import { env } from "./env"
// @ts-ignore
import { guilds } from "../data/guilds.js"
import { Message, OmitPartialGroupDMChannel, TextChannel} from 'discord.js';
import { client as discord_client, DiscordMessage } from './discord';
import { filter } from "./filters";
import {action} from "./actions";
import {load_plugins,} from "./plugin";
import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from "passport";
import {setup as setupAuth} from "./auth"

const app = express();

app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'session-secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,  // This forces cookies to only be sent over HTTPS
        sameSite: 'lax'  // Add this for better security

    }
}));
app.use(passport.authenticate('session'))

app.set('trust proxy', 1);

// Configure OIDC routes and client
setupAuth(app);

// Load plugins, as per config file
load_plugins(app);

// The bot basically functions around incoming messages, which we start from here...
discord_client.on('messageCreate', async (discord_message:OmitPartialGroupDMChannel<Message>) => {
    // Don't respond to automated messages
    if (discord_message.author.bot) return;

    // Filter message by server (guild)
    if(guilds[discord_message.guildId]) {

        // Create our own state-managed version of the incoming message
        const incoming = new DiscordMessage(discord_client, guilds[discord_message.guildId], discord_message);

        // Per Channel
        for (const guild_channel of incoming.guild_data.channels) {
            // Correct channel?
            if (incoming.message.channelId === guild_channel.channel_id ||
                (guild_channel.channel_id === '*'))
            {

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
                        await (discord_client.channels.cache.get(incoming.guild_data.log_channel_id) as TextChannel).send(error as string);
                    }
                    finally {
                        console.error(`ERROR: ${error} on ${incoming.message.guildId}.${incoming.message.channelId}:{"${incoming.message.content}"}`);
                    }
                }
            }
        }
    }
});

// Start the webserver
const server = app.listen(env.PORT, '0.0.0.0')
    .on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${env.PORT} is already in use. Another instance may be running.`);
        } else {
            console.error('❌ Error starting server:', err);
        }
        process.exit(1);
    })
    .on('listening', () => {
        const addr = server.address();
        if (addr !== null && typeof addr === 'object' && 'port' in addr) {
            console.log(`✅ Server is listening on http://localhost:${addr.port}`);
        } else {
            console.error(`❌ Server could not find reference to 0.0.0.0:${env.PORT} on running server!`);
            process.exit(1);
        }
    });

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('SIGUSR2 signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

// Login to Discord - that starts the bot!
discord_client.login(env.BOT_TOKEN);
