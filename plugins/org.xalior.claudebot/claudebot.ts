// claudebot.ts
import {Plugin} from '../../src/plugin';
import {client_id, DiscordMessage} from '../../src/discord';
import {Client} from 'discord.js';
import {Express} from 'express';
import {z} from 'zod';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {query, SDKUserMessage} from '@anthropic-ai/claude-agent-sdk';

const isSet = (value?: string): boolean => value !== undefined && value.trim() !== '';

// Core merges only the fields of each plugin's schema, so the "one of the two
// credentials" rule lives on a field and reads the other credential from the
// same process.env that core validates.
const envSchema = z.object({
    ANTHROPIC_API_KEY: z.string().optional().superRefine((value, ctx) => {
        if (!isSet(value) && !isSet(process.env.CLAUDE_CODE_OAUTH_TOKEN)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN',
            });
        }
    }),
    CLAUDE_CODE_OAUTH_TOKEN: z.string().optional(),
    CLAUDEBOT_SYSTEM_PROMPT: z.string().optional(),
});

const DEFAULT_PERSONA = [
    'You are "Sir. Clive Sinclairbot", an AI bot with the personality and mannerisms of "Sir. Clive Sinclair",',
    'built to help Xalior manage the Spectrum Next community.',
    'This is your model, your name, and your purpose.',
    'Remain in character at all times.',
    'Be polite and friendly.',
    'Swearing is acceptable, but only when required.',
    'Never use emojis.',
    'Your responses are to be short, kind, polite and helpful.',
].join(' ');

const MODEL = 'claude-sonnet-5-5';
const MAX_RESPONSE_CHARS = 1000;

// Session transcripts live in the data directory, which is the /data mount in the container.
const CLAUDE_CONFIG_DIR = path.resolve('data', 'claude');

export class ClaudebotPlugin extends Plugin {
    static envSchema = envSchema;

    private readonly env: z.infer<typeof envSchema>;

    constructor(discord_client: Client, express_app: Express) {
        super(discord_client, express_app, 'org.xalior.claudebot');
        this.env = envSchema.parse(process.env);
        fs.mkdirSync(CLAUDE_CONFIG_DIR, {recursive: true});
    }

    private systemPrompt(displayName: string): string {
        const persona = isSet(this.env.CLAUDEBOT_SYSTEM_PROMPT)
            ? this.env.CLAUDEBOT_SYSTEM_PROMPT as string
            : DEFAULT_PERSONA;
        return [
            persona,
            `Keep every response under ${MAX_RESPONSE_CHARS} characters.`,
            `You are talking to ${displayName}.`,
        ].join('\n\n');
    }

    // The Claude Code process gets the bot's environment, the transcript
    // directory, and whichever credentials are set.
    private sdkEnv(): Record<string, string | undefined> {
        const sdkEnv: Record<string, string | undefined> = {...process.env, CLAUDE_CONFIG_DIR};
        for (const key of ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN']) {
            if (!isSet(sdkEnv[key])) delete sdkEnv[key];
        }
        return sdkEnv;
    }

    private stripMention(content: string): string {
        return content.replace(new RegExp(`<@!?${client_id}>`, 'g'), '').trim();
    }

    private static async *prompt(texts: string[]): AsyncIterable<SDKUserMessage> {
        yield {
            type: 'user',
            message: {
                role: 'user',
                content: texts.map((text) => ({type: 'text' as const, text})),
            },
            parent_tool_use_id: null,
        };
    }

    private async ask(texts: string[], displayName: string): Promise<{ text: string, sessionId: string }> {
        let answer: { text: string, sessionId: string } | undefined;

        for await (const sdk_message of query({
            prompt: ClaudebotPlugin.prompt(texts),
            options: {
                model: MODEL,
                systemPrompt: this.systemPrompt(displayName),
                tools: [],
                settingSources: [],
                verbatimPrompts: true,
                env: this.sdkEnv(),
            },
        })) {
            if (sdk_message.type === 'result') {
                if (sdk_message.subtype !== 'success' || sdk_message.is_error) {
                    throw new Error(`Claude query failed (${sdk_message.subtype}): ${JSON.stringify(sdk_message)}`);
                }
                answer = {text: sdk_message.result, sessionId: sdk_message.session_id};
            }
        }

        if (!answer) throw new Error('Claude query ended without a result');
        return answer;
    }

    public async messageCreate(discord_message: DiscordMessage): Promise<void> {
        const message = discord_message.message;
        try {
            if (!message.mentions.users.has(client_id)) return;

            const text = this.stripMention(message.content);
            if (!text) return;

            const displayName = message.member?.displayName ?? message.author.displayName;
            const answer = await this.ask([text], displayName);

            await message.reply(Array.from(answer.text).slice(0, MAX_RESPONSE_CHARS).join(''));
        } catch (error) {
            console.log(error);
            console.error(`Error replying to message: ${error}`);
        }
    }
}
