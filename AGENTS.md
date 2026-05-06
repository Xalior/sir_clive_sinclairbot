Make sure you always route all database management via /src/persistance_adapter.ts parent model type

Core files (anything outside `plugins/` — notably `src/auth.ts`, `src/bot.ts`, `src/plugin.ts`, `data/plugins.ts` aside from the plugin-list array itself) must not contain per-plugin clauses, paths, or namespaces. Plugins are pluggable; the plugin system exists so plugins can be added or removed without editing core. When a plugin needs a core-level affordance (CSRF skip, body parser, route prefix, etc.), the right shape is a generic registry/extension point in core that plugins contribute to from their own constructor — never a literal plugin path or name in a core file.

