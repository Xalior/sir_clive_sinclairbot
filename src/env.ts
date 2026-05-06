// src/env.js
import { createEnv } from "@t3-oss/env-core";
import { z} from "zod";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();


export const env = createEnv({
    server: {
        BOT_TOKEN: z.string().nonempty("Discord App BOT_TOKEN must not be empty"),
        OPENAI_TOKEN: z.string().nonempty("Openweb-ui or OPENAI_TOKEN must not be empty"),
        CACHE_URL: z.string().nonempty("Redis CACHE_URL must not be empty"),
        OIDC_PROVIDER_URL: z.string().nonempty("Authentication OIDC_PROVIDER_URL must not be empty"),
        OIDC_CLIENT_ID: z.string().nonempty("Authentication OIDC_CLIENT_ID must not be empty"),
        OIDC_CLIENT_SECRET: z.string().nonempty("Authentication OIDC_CLIENT_SECRET must not be empty"),
        HOSTNAME: z.string().nonempty("Bot HOSTNAME must not be empty"),
        SESSION_SECRET: z.string().optional(),
        PORT: z.number().default(8443),
        VERBOSE: z.boolean().default(false)
    },

    // This function will be used to get the value of an environment variable
    runtimeEnv: process.env,
    // Optional: Error formatting
    onValidationError: (error) => {
        console.error("❌ Invalid environment variables:", error);
        throw new Error("Invalid environment variables");
    },
});