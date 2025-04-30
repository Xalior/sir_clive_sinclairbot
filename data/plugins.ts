import {PingPlugin} from "../plugins/ping";
import {ExamplePlugin} from "../plugins/exampleplugin";
import {CommandsPlugin} from "../plugins/commands";

const plugins = [
    CommandsPlugin,
    ExamplePlugin,
    PingPlugin
];
export { plugins };