// src/env.js
import { createEnv } from "@t3-oss/env-core";
import { z} from "zod";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();


export const env = createEnv({
    server: {
        // Discord token
        BOT_TOKEN: z.string().nonempty("BOT_TOKEN must not be empty"),
        OPENAI_TOKEN: z.string().nonempty("OPENAI_TOKEN must not be empty"),
        CACHE_URL: z.string().nonempty("CACHE_URL must not be empty"),
    },

    // This function will be used to get the value of an environment variable
    runtimeEnv: process.env,
    // Optional: Error formatting
    onValidationError: (error) => {
        console.error("❌ Invalid environment variables:", error);
        throw new Error("Invalid environment variables");
    },
});