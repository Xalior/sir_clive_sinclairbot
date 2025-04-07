
import { ChannelData } from "./channel";

interface GuildData {
    guild_id: string;
    log_channel_id: string,
    command_prefix: "!",
    channels: ChannelData[];
}

export { GuildData }