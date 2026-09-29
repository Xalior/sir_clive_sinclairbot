# Plugin architecture

A plugin is a class that extends `Plugin` (from `src/plugin.ts`). It lives at `plugins/<namespace>/<last-segment>.ts`, and the bot loads it at startup. Add new behaviour only in plugins. Core files contain no code for a specific plugin.

## File layout

```
plugins/
  org.xalior.example/
    example.ts        # exports a class extending Plugin
```

The loader reads each namespace from `data/plugins.ts`, splits it on `.`, and imports `plugins/<namespace>/<last-segment>`. For example, `org.xalior.example` resolves to `plugins/org.xalior.example/example.ts`. The loader uses the first exported value that is a constructor whose prototype is an instance of `Plugin`. The export name does not matter.

To register a plugin, add its namespace to the array in [`data/plugins.ts`](../data/plugins.ts). To unload it, remove the entry. You do not need to change anything else.

## Base class

`Plugin` (in [`src/plugin.ts`](../src/plugin.ts)) gives each plugin these members:

| Member | What it gives you |
|---|---|
| `this.express_app` | the shared Express app. Mount routes here. |
| `this._discord_client` | the discord.js `Client`, ready to use |
| `this.persistance` | a `PersistanceAdapter` in your plugin's namespace (stored in Redis, with optional TTL) |
| `this._plugin_name` | the namespace string passed to `super()` |

The constructor must call `super(discord_client, express_app, '<your.namespace>')` exactly once. Code that uses `this.persistance`, `this._discord_client` or any other member of `this` must come after `super()`, because those fields do not exist before it runs.

### Override hooks

All hooks are optional. Override only the ones you need.

- `messageCreate(msg, config?)`: core calls it for a guild message when the channel's `pass` or `fail` action in `data/guilds.js` names your plugin under `plugin`. `config` is the value of that entry. The default calls `message()` with the message text.
- `message(msg, content, config?)`: the default `messageCreate()` calls it. The base class version throws an error.
- `messageDirectCreate(msg)`: core calls it for every direct message, on every loaded plugin. The default does nothing.
- `getWidget(req)` / `getSecureWidget(req)`: return HTML for an anonymous or authenticated widget area.
- `getNavblock(req)` / `getSecureNavblock(req)`: return `<ul>` fragments for the top navbar. Core does not call the widget or navbar hooks.
- `onLoaded()`: runs after the constructor and after the loader registers the plugin's `csrfSkipPaths`. Use it to mount routes that need `this`. The loader logs the string it returns.
- `unregister()`: logs a line. Core does not call it.

## Extension points

A plugin declares what it needs from core in fields on its class. Core never names a plugin.

### `csrfSkipPaths` skips CSRF checks for specific routes

The web server protects every non-GET route with CSRF tokens. If a plugin mounts a non-GET endpoint that does not use browser cookies, such as a webhook or a machine-to-machine API, it must list those paths:

```ts
public csrfSkipPaths = ['/api/myplugin/**'];
```

The patterns use minimatch-style globs. `*` matches one path segment and never matches `/`. `**` matches zero or more segments, including the slashes. A trailing `/**` is a special case. `/api/myplugin/**` matches `/api/myplugin` itself and every path below it. Matching is anchored, so `/api/myplugins` does not match `/api/myplugin/**`.

The loader registers each plugin's `csrfSkipPaths` after it constructs the plugin. The auth module adds its own `/callback/**` entry through the same registry. OAuth has no special case.

### `static envSchema` declares required env vars

A plugin that needs configuration declares a Zod schema on the class:

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

All `process.env` values are strings. For a numeric var, use `z.coerce.number()`, not `z.number()`.

The loader collects the `envSchema` of every plugin, merges them, and validates the result against `process.env` *before* it constructs any plugin. Two failures stop startup:

- A required var is missing, or a value does not match the schema. The bot logs each failed key and exits with code 1.
- Two plugins declare the same env var name. The bot reports both plugin names and the key, and exits.

After this validation passes, your constructor can call `envSchema.parse(process.env)` to get typed values:

```ts
constructor(discord_client: Client, express_app: Express) {
    super(discord_client, express_app, 'org.xalior.myplugin');
    this.env = envSchema.parse(process.env);
}
```

Put plugin-specific env vars in the plugin file, never in [`src/env.ts`](../src/env.ts). If operators need to know about a new var, add it to [`docs/env.txt`](env.txt). That file is the only project-level list of env vars.

### `static requires` declares required plugins

A plugin that depends on another plugin lists that plugin's namespace on the class:

```ts
export class MyPlugin extends Plugin {
    static requires = ['org.xalior.commands'];
    // ...
}
```

After the loader imports every plugin in [`data/plugins.ts`](../data/plugins.ts), it checks that it imported each namespace in each plugin's `requires`. If one is missing, the bot logs the plugin and the namespace it needs, and exits with code 1 before it constructs any plugin. The check is for presence only. The order of the list in `data/plugins.ts` does not matter.

## Loader sequence

The loader runs these steps in order:

1. **Import every plugin module** named in `data/plugins.ts`. Find the class that extends `Plugin`. If it has a `static envSchema`, register the schema.
2. **Check plugin requirements, then validate the merged plugin env against `process.env`.** No try/catch surrounds these checks, so a failure stops startup.
3. **Construct each plugin** with `new PluginClass(client, express_app)`. Register the instance's `csrfSkipPaths`. Await `onLoaded()` and log what it returns.

The loader catches errors during import or construction for each plugin separately. It logs them with a `🗑️` prefix and continues with the other plugins. It does not catch errors from the requirement check or the env validation, because invalid configuration is fatal.

## Storage

Every plugin instance gets `this.persistance: PersistanceAdapter<T>` in the plugin's own namespace. The adapter stores data in Redis, with keys of the form `<HOSTNAME>:<plugin-name>:<id>`.

Operations:

- `await this.persistance.get(id)` / `find(id)` → `T | undefined`
- `await this.persistance.upsert(id, payload, expiresIn?)`, where `expiresIn` is in seconds. Omit it for no TTL.
- `await this.persistance.destroy(id)`

The relay plugin uses a TTL for its nonce store. The chatbot keeps conversation context with no TTL.

## Web routes

`this.express_app` is the global Express app. Mount routes in the constructor or in `onLoaded()`. The relay plugin mounts its route in `onLoaded()` because its handler needs `this.persistance`. The commands plugin mounts its routes in the constructor, before `super()`.

You can use any route prefix. For HTTP APIs the convention is `/api/<plugin>/v<version>/...`, so that a new version of an API does not collide with the old one.

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

Save it as `plugins/org.example.hello/hello.ts`, add `'org.example.hello'` to `data/plugins.ts`, and restart the bot.

## Per-plugin reference

- [chatbot](plugins/chatbot.md): LLM conversation
- [claudebot](plugins/claudebot.md): Claude conversation through the Claude Agent SDK, one thread per Discord reply chain
- [commands](plugins/commands.md): `!help`, `!ping`, `!uptime`, `!version`, `!register`
- [example](plugins/example.md): the minimal reference plugin
- [honeypot](plugins/honeypot.md): trap channel that mutes whoever posts in it
- [ping](plugins/ping.md): counted `!ping` reply
- [relay](plugins/relay.md): HMAC-authenticated HTTP endpoint that posts to Discord
