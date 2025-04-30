// bot.ts
import { env } from "./env"
// @ts-ignore
import { guilds } from "../data/guilds.js"
import { GatewayIntentBits, Message, OmitPartialGroupDMChannel, TextChannel} from 'discord.js';
import { client, DiscordMessage } from './discord';
import { GuildData } from "./guild";
import { filter } from "./filters";
import {action} from "./actions";
import {load_plugins, plugins} from "./plugin";
import express from 'express';

let client_id: string | undefined;

const app = express();
app.set('trust proxy', 1);

load_plugins(app);