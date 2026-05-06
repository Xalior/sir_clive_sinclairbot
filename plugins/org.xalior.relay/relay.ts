import {Plugin} from '../../src/plugin.ts';
import {Client} from 'discord.js';
import express, {Express} from 'express';
import {z} from 'zod';
import {verifyRequest} from './verify.ts';
import {deliverMessage} from './deliver.ts';
import type {RelaySendError, RelaySendSuccess} from './types.ts';

const envSchema = z.object({
    RELAY_SIGNING_KEY: z.string().nonempty("RELAY_SIGNING_KEY must be set"),
    RELAY_CLOCK_SKEW: z.coerce.number().int().positive().default(30),
});

export class RelayPlugin extends Plugin {
    static envSchema = envSchema;
    public csrfSkipPaths = ['/api/relay/**'];

    private readonly env: z.infer<typeof envSchema>;

    constructor(discord_client: Client, express_app: Express) {
        super(discord_client, express_app, 'org.xalior.relay');
        this.env = envSchema.parse(process.env);
    }

    public async onLoaded(): Promise<string> {
        // Route mounting deferred to onLoaded (not pre-super in the constructor as the
        // commands plugin does) because the handler depends on this.persistance, which
        // is only initialised by Plugin's constructor.
        const jsonParser = express.json({
            verify: (req, _res, buf) => { (req as any).rawBody = Buffer.from(buf); }
        });
        this.express_app.post('/api/relay/v1/send', jsonParser, async (req, res) => {
            const result = await verifyRequest(req.headers, req.body, (req as any).rawBody, {
                signingKey: this.env.RELAY_SIGNING_KEY,
                clockSkew: this.env.RELAY_CLOCK_SKEW,
                persistance: this.persistance,
            });
            if (!result.ok) {
                return res.status(result.status).json({
                    ok: false,
                    error: { code: result.code, message: result.message },
                } satisfies RelaySendError);
            }
            const delivered = await deliverMessage(this._discord_client, result.req);
            if (!delivered.ok) {
                return res.status(delivered.status).json({
                    ok: false,
                    error: { code: delivered.code, message: delivered.message },
                } satisfies RelaySendError);
            }
            return res.status(200).json({
                ok: true,
                message_id: delivered.message_id,
            } satisfies RelaySendSuccess);
        });

        return super.onLoaded();
    }
}
