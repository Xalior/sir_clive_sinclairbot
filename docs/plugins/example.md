# org.xalior.example

The minimal reference plugin. It replies to every message it receives with a timestamp. Copy it to start your own plugin.

Source: [`plugins/org.xalior.example/example.ts`](../../plugins/org.xalior.example/example.ts)

## Behaviour

`message(msg, content, config?)` is the only override. It replies in the channel with `Replied at <timestamp>`. If the config has a `config.message`, the reply is `Replied "<config.message>" at <timestamp>`.

The `config` argument comes from the channel entry in `data/guilds.js` that sends messages to this plugin. If no channel entry names the plugin, core never calls it. So you can leave it loaded, and it does nothing.

## Configuration

None.

## Storage

Not used.

## Why it's here

It is the smallest working plugin. It has a class that extends `Plugin`, a constructor that calls `super()`, and one override. To write a new plugin, copy this file, change the namespace, register it in [`data/plugins.ts`](../../data/plugins.ts), and replace the body of `message()`.

[`../plugins.md`](../plugins.md) describes the plugin architecture and the extension points.
