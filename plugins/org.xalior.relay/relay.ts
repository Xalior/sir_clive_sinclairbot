import {Plugin} from '../../src/plugin.ts';
import {Client} from 'discord.js';
import express, {Express} from 'express';
import {z} from 'zod';

const envSchema = z.object({
    RELAY_SIGNING_KEY: z.string().nonempty("RELAY_SIGNING_KEY must be set"),
    RELAY_CLOCK_SKEW: z.coerce.number().int().positive().default(30),
});

export class RelayPlugin extends Plugin {
    static envSchema = envSchema;
    public csrfSkipPaths = ['/api/relay/**'];

    constructor(discord_client: Client, express_app: Express) {
        const env = envSchema.parse(process.env);

        const jsonParser = express.json({
            verify: (req, _res, buf) => { (req as any).rawBody = Buffer.from(buf); }
        });
        express_app.post('/api/relay/v1/send', jsonParser, async (_req, res) => {
            res.status(501).json({
                ok: false,
                error: { code: 'not_implemented', message: 'Relay handler stub' }
            });
        });

        super(discord_client, express_app, 'org.xalior.relay');
    }
}
