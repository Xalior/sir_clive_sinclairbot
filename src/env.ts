// src/env.js
import { createEnv } from "@t3-oss/env-core";
import { z} from "zod";

export const env = createEnv({
    server: {
        // Discord token
        BOT_TOKEN: z.string().nonempty("BOT_TOKEN must not be empty"),
        OPENAI_TOKEN: z.string().nonempty("OPENAI_TOKEN must not be empty"),
    },

    runtimeEnv: process.env
});