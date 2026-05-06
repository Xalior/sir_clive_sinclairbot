# org.xalior.example

The minimal reference plugin. Replies to every message with a timestamp. Use it as a copy-paste starting point for your own plugin.

Source: [`plugins/org.xalior.example/example.ts`](../../plugins/org.xalior.example/example.ts)

## Behaviour

`message(msg, content, config?)` is the only override. It replies in-channel with either `Replied at <timestamp>` or, if a `config.message` is passed in, `Replied "<config.message>" at <timestamp>`.

The `config` argument comes from whatever per-channel routing is configured for this plugin upstream of the call. In a default setup the plugin won't be invoked unless that wiring is present, so it's safe to leave loaded as a no-op example.

## Configuration

None.

## Storage

Not used.

## Why it's here

It's the smallest viable plugin: a class extending `Plugin`, a constructor that calls `super()`, one override. If you want to write a new plugin, copy this file, change the namespace, register it in [`data/plugins.ts`](../../data/plugins.ts), and start replacing the body of `message()`.

The architecture overview in [`../plugins.md`](../plugins.md) covers the available extension points.
