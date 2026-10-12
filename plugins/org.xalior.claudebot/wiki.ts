// wiki.ts
import {z} from 'zod';
import {z as z4} from 'zod/v4';
import {createSdkMcpServer, tool, McpSdkServerConfigWithInstance} from '@anthropic-ai/claude-agent-sdk';

// The MCP server name, so each wiki's tool is mcp__wiki__<id>.
const SERVER_NAME = 'wiki';
const SEARCH_LIMIT = 8;
const PAGE_MAX_CHARS = 50000;
const REQUEST_TIMEOUT_MS = 15000;
const USER_AGENT = 'sir_clive_sinclairbot (+https://github.com/Xalior/sir_clive_sinclairbot)';
const ACTIONS = ['search', 'page'] as const;

export type WikiAction = typeof ACTIONS[number];

// One wiki in a channel's config. The id is the tool name, so it is limited to
// characters that are valid in an MCP tool name.
const wikiSchema = z.object({
    id: z.string().regex(/^[a-z0-9_]+$/),
    name: z.string().min(1),
    api: z.string().url(),
    about: z.string().optional(),
});

export const wikisSchema = z.array(wikiSchema).superRefine((wikis, ctx) => {
    const ids = wikis.map((wiki) => wiki.id);
    if (new Set(ids).size !== ids.length) {
        ctx.addIssue({code: z.ZodIssueCode.custom, message: 'Wiki ids must be unique'});
    }
});

export type Wiki = z.infer<typeof wikiSchema>;

export interface WikiTools {
    mcpServers: Record<string, McpSdkServerConfigWithInstance>;
    allowedTools: string[];
}

interface SearchHit {
    title: string;
    snippet: string;
}

async function api(wiki: Wiki, params: Record<string, string>): Promise<any> {
    const url = new URL(wiki.api);
    for (const [key, value] of Object.entries({...params, format: 'json', formatversion: '2'})) {
        url.searchParams.set(key, value);
    }
    const response = await fetch(url, {
        headers: {'User-Agent': USER_AGENT},
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (body.error) throw new Error(`${body.error.code}: ${body.error.info}`);
    return body;
}

// With no srwhat, MediaWiki's database search backend matches titles only, so
// the tool runs a title search and a text search. Title hits come first.
async function search(wiki: Wiki, text: string): Promise<string> {
    const hits = new Map<string, SearchHit>();
    for (const srwhat of ['title', 'text']) {
        const body = await api(wiki, {
            action: 'query', list: 'search', srsearch: text, srwhat,
            srlimit: String(SEARCH_LIMIT), srprop: 'snippet',
        });
        for (const hit of body.query.search as SearchHit[]) {
            if (!hits.has(hit.title)) hits.set(hit.title, hit);
        }
    }
    if (hits.size === 0) return 'No results.';
    return Array.from(hits.values())
        .map((hit) => `- ${hit.title}: ${hit.snippet.replace(/<[^>]+>/g, '')}`)
        .join('\n');
}

// The page as plain text, from the TextExtracts extension, which the wiki must have.
async function page(wiki: Wiki, title: string): Promise<string> {
    const body = await api(wiki, {
        action: 'query', prop: 'extracts|info', inprop: 'url', explaintext: '1',
        exsectionformat: 'wiki', titles: title, redirects: '1',
    });
    const found = body.query.pages[0];
    if (found.missing || found.invalid) return `No page titled "${title}".`;
    if (typeof found.extract !== 'string') throw new Error('The wiki returned no text extract');
    const text = found.extract.length > PAGE_MAX_CHARS
        ? `${found.extract.slice(0, PAGE_MAX_CHARS)}\n\n[Page cut at ${PAGE_MAX_CHARS} characters.]`
        : found.extract;
    return `Title: ${found.title}\nURL: ${found.fullurl}\n\n${text}`;
}

function wikiTool(wiki: Wiki) {
    return tool(
        wiki.id,
        [
            `Search or read pages on the ${wiki.name}.`,
            wiki.about,
            'Use action "search" with a few key words first, then action "page" with an exact title from the results.',
            'Cite the page URL in your answer.',
        ].filter(Boolean).join(' '),
        {
            action: z4.enum(ACTIONS),
            query: z4.string().describe('The search words for "search", or the exact page title for "page".'),
        },
        async ({action, query}) => {
            try {
                const text = action === 'search' ? await search(wiki, query) : await page(wiki, query);
                return {content: [{type: 'text' as const, text}]};
            } catch (error) {
                console.error(`Wiki ${wiki.id} ${action} failed: ${error}`);
                return {content: [{type: 'text' as const, text: `The wiki request failed: ${error}`}], isError: true};
            }
        },
        {annotations: {readOnlyHint: true}},
    );
}

// The tools for a channel's wikis, one per wiki, or undefined when the channel has none.
export function wikiTools(wikis: Wiki[]): WikiTools | undefined {
    if (wikis.length === 0) return undefined;
    return {
        mcpServers: {[SERVER_NAME]: createSdkMcpServer({name: SERVER_NAME, tools: wikis.map(wikiTool)})},
        allowedTools: wikis.map((wiki) => `mcp__${SERVER_NAME}__${wiki.id}`),
    };
}

// The action of a call to a wiki tool, or undefined when the call is to any other tool.
export function wikiAction(toolName: string, input: unknown): WikiAction | undefined {
    if (!toolName.startsWith(`mcp__${SERVER_NAME}__`)) return undefined;
    const action = (input as {action?: unknown} | undefined)?.action;
    return ACTIONS.find((known) => known === action);
}
