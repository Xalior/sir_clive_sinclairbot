# Plugin architecture

A plugin is a class that extends `Plugin` (from `src/plugin.ts`) and lives under `plugins/<namespace>/<last-segment>.ts`. The bot loads it dynamically at startup. Plugins are the only place to add behaviour — core files do not contain per-plugin code.

## File layout

```
plugins/
  org.xalior.example/
    example.ts        # exports a class extending Plugin
```

The loader takes the namespace from `data/plugins.ts`, splits on `.`, and imports `plugins/<namespace>/<last-segment>`. So `org.xalior.example` resolves to `plugins/org.xalior.example/example.ts`. The loader picks up whichever exported value is a constructor whose prototype is an instance of `Plugin` — the export name doesn't matter.

Register a plugin by appending its namespace to the array in [`data/plugins.ts`](../data/plugins.ts). Removing the entry unloads it; nothing else needs to change.

## Base class

`Plugin` (in [`src/plugin.ts`](../src/plugin.ts)) wires the common surface:

| Member | What it gives you |
|---|---|
| `this.express_app` | the shared Express app — mount routes here |
| `this._discord_client` | the discord.js `Client`, ready to use |
| `this.persistance` | a `PersistanceAdapter` namespaced to your plugin (Redis-backed, with optional TTL) |
| `this._plugin_name` | the namespace string passed to `super()` |

The constructor must call `super(discord_client, express_app, '<your.namespace>')` exactly once, last. Anything that touches `this.persistance` or `this._discord_client` belongs *after* `super()` — those fields don't exist before it runs.

### Override hooks

All optional. Override what you need, leave the rest.

- `message(msg, content, config?)` — invoked by guild message handlers when your plugin is configured to receive that channel's traffic.
- `messageCreate(msg, config?)` — direct entry from Discord's `messageCreate` event for guild messages.
- `messageDirectCreate(msg)` — same, for DMs. Default is silent.
- `getWidget(req)` / `getSecureWidget(req)` — return HTML for the homepage's anonymous / authenticated widget area.
- `getNavblock(req)` / `getSecureNavblock(req)` — return `<ul>` fragments contributed to the top navbar.
- `onLoaded()` — runs after `super()` and after registry hand-off (see below); good for late route mounting that needs `this`. Return a string to be logged at boot.
- `unregister()` — currently informational; called when shutting a plugin down.

## Extension points

Two declarative slots let plugins ask core for affordances without core ever naming them.

### `csrfSkipPaths` — bypass CSRF for specific routes

The web server protects every non-GET route with CSRF tokens. A plugin that mounts a non-GET endpoint without UI cookies (webhooks, machine-to-machine APIs) must allowlist its paths:

```ts
public csrfSkipPaths = ['/api/myplugin/**'];
```

Patterns are minimatch-style: `*` matches one path segment (no `/`), `**` matches any number of segments (zero or more) including slashes. A trailing `/**` is special-cased so `/api/myplugin/**` matches `/api/myplugin` itself as well as anything below it. Matching is anchored — `/api/myplugins` does not match `/api/myplugin/**`.

The loader registers each plugin's `csrfSkipPaths` after construction. The auth module seeds its own `/callback/**` entry through the same registry — there is no special case for OAuth.

### `static envSchema` — declare required env vars

A plugin that needs configuration declares a Zod schema on the class itself:

```ts
import { z } from 'zod';

const envSchema = z.object({
    MY_PLUGIN_KEY: z.string().nonempty(),
    MY_PLUGIN_TIMEOUT: z.coerce.number().int().positive().default(30),
});

export class MyPlugin extends Plugin {
    static envSchema = envSchema;
    // …
}
```

`process.env` values arrive as strings, so use `z.coerce.number()` rather than `z.number()` for numeric vars.

The loader collects every plugin's `envSchema`, merges them, and validates against `process.env` *before* constructing any plugin. Two failure modes terminate startup:

- **Validation failure.** A required var is missing or a value doesn't fit. The bot logs each failed key and exits with code 1.
- **Key collision.** Two plugins declare the same env var name. The bot reports both plugin names and the colliding key, and exits.

Once central validation has passed, your constructor is free to call `envSchema.parse(process.env)` for typed access:

```ts
constructor(discord_client: Client, express_app: Express) {
    super(discord_client, express_app, 'org.xalior.myplugin');
    this.env = envSchema.parse(process.env);
}
```

Plugin-specific env vars live in the plugin file, never in [`src/env.ts`](../src/env.ts). If a new var should appear in operator docs, add it to [`docs/env.txt`](env.txt) — that's the only project-level surface.

## Loader sequence

The loader runs in two passes:

1. **Import every plugin module** named in `data/plugins.ts`. Find the `Plugin`-extending class. If it has a `static envSchema`, register the schema.
2. **Validate the merged plugin env against `process.env`.** This sits between the passes, fails loud, and is intentionally outside any try/catch.
3. **Construct each plugin** with `new PluginClass(client, express_app)`. Register the constructed instance's `csrfSkipPaths`. Await `onLoaded()` and log its return.

Errors during import or construction are caught per-plugin and logged with a `🗑️` prefix; the bot continues with the rest. Errors during env validation are not caught — invalid configuration is fatal.

## Storage

Every plugin instance gets `this.persistance: PersistanceAdapter<T>`, namespaced by plugin name. The adapter is Redis-backed; keys are `<HOSTNAME>:<plugin-name>:<id>`.

Operations:

- `await this.persistance.get(id)` / `find(id)` → `T | undefined`
- `await this.persistance.upsert(id, payload, expiresIn?)` — `expiresIn` in seconds; omit for no TTL
- `await this.persistance.destroy(id)`

The relay plugin uses TTL for its nonce store; the chatbot uses unbounded keys for conversation context. Pick what fits.

## Web routes

`this.express_app` is the global Express app. Mount routes either in the constructor (after `super()` if you need `this`) or in `onLoaded()`. The relay plugin mounts in `onLoaded()` because its handler needs `this.persistance`; the commands plugin mounts in the constructor because its handler doesn't.

Route paths can use any prefix you like, but for HTTP APIs the convention is `/api/<plugin>/v<version>/...` so versioned upgrades don't collide.

## A minimal working plugin

```ts
import { Plugin } from '../../src/plugin';
import { Client } from 'discord.js';
import { Express } from 'express';

export class HelloPlugin extends Plugin {
    constructor(discord_client: Client, express_app: Express) {
        super(discord_client, express_app, 'org.example.hello');
    }

    public async messageCreate(discord_message): Promise<void> {
        if (discord_message.message.content === '!hello') {
            await discord_message.message.reply('hi');
        }
    }
}
```

Save as `plugins/org.example.hello/hello.ts`, append `'org.example.hello'` to `data/plugins.ts`, restart. That's the whole loop.

## Per-plugin reference

- [chatbot](plugins/chatbot.md) — LLM conversation
- [commands](plugins/commands.md) — `!help`, `!ping`, `!uptime`, `!version`, `!register`
- [example](plugins/example.md) — the minimal reference plugin
- [ping](plugins/ping.md) — counted `!ping` reply
- [relay](plugins/relay.md) — HMAC-authenticated HTTP endpoint that posts to Discord
