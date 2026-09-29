// claudebot.ts
import {Plugin} from '../../src/plugin';
import {client_id, DiscordMessage} from '../../src/discord';
import {Client, Message, MessageReaction} from 'discord.js';
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
const THREAD_TTL_DAYS = 10;
const THREAD_TTL_SECONDS = THREAD_TTL_DAYS * 24 * 60 * 60;
const LINK_ACCOUNT_REPLY = 'Please link your account first. Send `!register` and follow the link I send you.';
const EXPIRED_REPLY = 'That conversation has expired, and I no longer remember it. Tag me to start a new one.';

const RECEIVED_REACTION = '🤖';
const THINKING_REACTION = '🤔';
const WRITING_REACTION = '✍️';
const ERROR_REACTION = '❌';
const HELP_REACTION = '🆘';
const LINK_ACCOUNT_REACTION = '🔒';

const HELP_FILE = './plugins/org.xalior.claudebot/responses/help.md';

type Progress = 'thinking' | 'writing';

// Variables the Claude Code process may receive from the bot's environment.
const SDK_ENV_ALLOWLIST = [
    'PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'TZ',
    'HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'NO_PROXY', 'no_proxy',
    'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE',
    'ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN',
];

// Session transcripts live in the data directory, which is the /data mount in the container.
const CLAUDE_CONFIG_DIR = path.resolve('data', 'claude');

// Stored under msg:<bot reply ID>: the session that produced the reply, the
// user who owns that session, and the reply's last assistant message.
interface ReplyEntry {
    sessionId: string;
    ownerId: string;
    assistantUuid?: string;
}

// Stored under session:<session ID>: the latest bot reply in that session.
interface SessionEntry {
    replyId: string;
}

interface ResumeFrom {
    sessionId: string;
    // A branch is a new session that keeps the history up to the assistant message branchAt.
    branch: boolean;
    branchAt?: string;
}

// Shows the bot's progress as reactions on the user's message. The received
// reaction stays; each progress reaction replaces the one before it. Only the
// bot's own reactions are removed.
class ProgressReactions {
    private readonly message: Message;
    private progress?: Progress;
    private reaction?: MessageReaction;

    constructor(message: Message) {
        this.message = message;
    }

    private async react(emoji: string): Promise<MessageReaction | undefined> {
        try {
            return await this.message.react(emoji);
        } catch (error) {
            console.error(`Error reacting to message: ${error}`);
            return undefined;
        }
    }

    private async clear(): Promise<void> {
        const reaction = this.reaction;
        this.reaction = undefined;
        try {
            await reaction?.users.remove();
        } catch (error) {
            console.error(`Error removing reaction: ${error}`);
        }
    }

    public async received(): Promise<void> {
        await this.react(RECEIVED_REACTION);
    }

    public async step(progress: Progress): Promise<void> {
        // Thinking shows only before writing starts, and each step shows once.
        if (this.progress === progress || (progress === 'thinking' && this.progress === 'writing')) return;
        this.progress = progress;
        await this.clear();
        this.reaction = await this.react(progress === 'thinking' ? THINKING_REACTION : WRITING_REACTION);
    }

    public async done(): Promise<void> {
        await this.clear();
    }

    public async failed(): Promise<void> {
        await this.clear();
        await this.react(ERROR_REACTION);
    }
}

interface Answer {
    text: string;
    sessionId: string;
    assistantUuid?: string;
}

export class ClaudebotPlugin extends Plugin {
    static envSchema = envSchema;
    // !register, which links a Discord account for the require_account gate, comes from org.xalior.commands.
    static requires = ['org.xalior.commands'];

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
            'Answer what was asked, then stop. Do not end with a question or an offer of more help, such as "Shall I go deeper?". Ask a question only when you cannot answer without more information.',
            `You are talking to ${displayName}.`,
        ].join('\n\n');
    }

    // The Claude Code process gets a fresh environment built from an allowlist,
    // never a copy of process.env, so it never holds the bot's other secrets
    // (Discord token, session and OIDC secrets, other plugins' keys). It gets
    // what it needs to start and reach the API, the transcript directory, and
    // whichever Claude credentials are set. Unset and empty values are left out.
    private sdkEnv(): Record<string, string> {
        const sdkEnv: Record<string, string> = {CLAUDE_CONFIG_DIR};
        for (const key of SDK_ENV_ALLOWLIST) {
            const value = process.env[key];
            if (isSet(value)) sdkEnv[key] = value as string;
        }
        return sdkEnv;
    }

    private stripMention(content: string): string {
        return content.replace(new RegExp(`<@!?${client_id}>`, 'g'), '').trim();
    }

    // !help goes to several plugins and each answers for itself, so the help
    // text goes to the author by DM and nothing is posted in the channel.
    private async help(discord_message: DiscordMessage, text: string): Promise<boolean> {
        if (text.split(/\s+/)[0].toLowerCase() !== '!help') return false;
        await discord_message.message.author.send(fs.readFileSync(HELP_FILE, 'utf8'));
        await discord_message.message.react(HELP_REACTION);
        return true;
    }

    public async messageDirectCreate(discord_message: DiscordMessage): Promise<void> {
        try {
            await this.help(discord_message, discord_message.message.content.trim());
        } catch (error) {
            console.log(error);
            console.error(`Error sending help: ${error}`);
        }
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

    private async ask(texts: string[], displayName: string, from: ResumeFrom | undefined, progress: ProgressReactions): Promise<Answer> {
        let answer: Answer | undefined;
        let assistantUuid: string | undefined;

        for await (const sdk_message of query({
            prompt: ClaudebotPlugin.prompt(texts),
            options: {
                model: MODEL,
                systemPrompt: this.systemPrompt(displayName),
                tools: [],
                settingSources: [],
                verbatimPrompts: true,
                includePartialMessages: true,
                // Transcripts expire with the thread entries.
                settings: {cleanupPeriodDays: THREAD_TTL_DAYS},
                env: this.sdkEnv(),
                ...(from && {resume: from.sessionId}),
                ...(from?.branch && {resumeSessionAt: from.branchAt, forkSession: true}),
            },
        })) {
            if (sdk_message.type === 'stream_event' && sdk_message.parent_tool_use_id === null
                && sdk_message.event.type === 'content_block_start') {
                const block = sdk_message.event.content_block.type;
                if (block === 'thinking') await progress.step('thinking');
                if (block === 'text') await progress.step('writing');
            } else if (sdk_message.type === 'assistant' && sdk_message.parent_tool_use_id === null) {
                assistantUuid = sdk_message.uuid;
            } else if (sdk_message.type === 'result') {
                if (sdk_message.subtype !== 'success' || sdk_message.is_error) {
                    throw new Error(`Claude query failed (${sdk_message.subtype}): ${JSON.stringify(sdk_message)}`);
                }
                answer = {text: sdk_message.result, sessionId: sdk_message.session_id, assistantUuid};
            }
        }

        if (!answer) throw new Error('Claude query ended without a result');
        return answer;
    }

    private static displayName(message: Message): string {
        return message.member?.displayName ?? message.author.displayName;
    }

    // A new thread started from a reply opens with two text blocks in one user
    // message: the replied-to message with its author's name, then the new text.
    private seed(referenced: Message, text: string): string[] {
        const quoted = this.stripMention(referenced.content);
        return [
            quoted ? `${ClaudebotPlugin.displayName(referenced)} wrote:\n${quoted}` : '',
            text,
        ].filter((part) => part !== '');
    }

    public async messageCreate(discord_message: DiscordMessage, config?: any): Promise<void> {
        const message = discord_message.message;
        let progress: ProgressReactions | undefined;
        try {
            const mentioned = message.mentions.users.has(client_id);
            const repliesToBot = message.reference !== null && message.mentions.repliedUser?.id === client_id;
            if (!mentioned && !repliesToBot) return;

            const text = this.stripMention(message.content);
            if (mentioned && await this.help(discord_message, text)) return;

            const referenced = message.reference
                ? await message.fetchReference().catch(() => undefined)
                : undefined;
            const authorId = message.author.id;

            let texts: string[];
            let from: ResumeFrom | undefined;

            if (referenced && referenced.author.id === client_id) {
                const entry = await this.persistance.find(`msg:${referenced.id}`) as ReplyEntry | undefined;
                if (!entry) {
                    await message.reply(EXPIRED_REPLY);
                    return;
                }
                if (entry.ownerId === authorId) {
                    // The owner continues the thread from its latest reply, or branches from an older one.
                    const latest = await this.persistance.find(`session:${entry.sessionId}`) as SessionEntry | undefined;
                    from = {
                        sessionId: entry.sessionId,
                        branch: latest?.replyId !== referenced.id,
                        branchAt: entry.assistantUuid,
                    };
                    texts = [text];
                } else {
                    // The system prompt holds the owner's name, so anyone else starts their own thread.
                    texts = this.seed(referenced, text);
                }
            } else if (referenced && mentioned) {
                texts = this.seed(referenced, text);
            } else if (mentioned) {
                texts = [text];
            } else {
                return;
            }

            texts = texts.filter((part) => part !== '');
            if (texts.length === 0) return;

            // Channels that set require_account: true answer only users with a linked account.
            // The notice goes by DM, like !help, and the reaction shows it was sent.
            if (config?.require_account === true && await this.getDiscordUser(authorId) === undefined) {
                await message.author.send(LINK_ACCOUNT_REPLY);
                await message.react(LINK_ACCOUNT_REACTION);
                return;
            }

            progress = new ProgressReactions(message);
            await progress.received();

            const answer = await this.ask(texts, ClaudebotPlugin.displayName(message), from, progress);
            const reply = await message.reply(Array.from(answer.text).slice(0, MAX_RESPONSE_CHARS).join(''));
            await progress.done();

            await this.persistance.upsert(`msg:${reply.id}`, {
                sessionId: answer.sessionId,
                ownerId: authorId,
                assistantUuid: answer.assistantUuid,
            } satisfies ReplyEntry, THREAD_TTL_SECONDS);
            await this.persistance.upsert(`session:${answer.sessionId}`, {
                replyId: reply.id,
            } satisfies SessionEntry, THREAD_TTL_SECONDS);
        } catch (error) {
            console.log(error);
            console.error(`Error replying to message: ${error}`);
            await progress?.failed();
        }
    }
}
