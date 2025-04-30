import {PingPlugin} from "../plugins/org.xalior.ping/ping";
import {Example} from "../plugins/org.xalior.example/example";
import {CommandsPlugin} from "../plugins/org.xalior.commands/commands";

const plugins = [
    CommandsPlugin,
    Example,
    PingPlugin
];
export { plugins };