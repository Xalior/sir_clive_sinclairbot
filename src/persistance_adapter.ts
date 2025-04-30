import Redis from 'ioredis';
import { env } from "./env"

const SLUG = 'sir_clive_sinclairbot';
const cache = new Redis(env.CACHE_URL);
const DEBUG_ADAPTER = true;

class PersistanceAdapter {
    private model: string;
    /**
     *
     * Creates an instance of PersistanceAdapter for the all database access.
     *
     * @constructor
     * @param {string} name Name of the model.
     *
     */
    constructor(name: string) {
        this.model = name;
    }

    /**
     *
     * Generates the storage key string for a given model instance.
     *
     * @param {string} id Identifier for the stored instance.
     * @return {string} Fully qualified key used in the key-value store.
     *
     * The key is namespaced using the configured slug and the model name to
     * prevent collisions across different models and environments. This is
     * used for all operations involving storage, retrieval, and deletion.
     *
     */
    key(id: string): string {
        return `${SLUG}:${this.model}:${id}`;
    }

    /**
     *
     * Update or Create an instance of a data object.
     *
     * @return {Promise<void>} Promise fulfilled when the operation succeeded. Rejected with error when encountered.
     * @param {string} id Identifier that SCS will use to reference this model instance for future operations.
     * @param {object} payload Object with all properties intended for storage.
     * @param {number} expiresIn Number of seconds intended for this model to be stored.
     *
     */
    async upsert(id: string, payload: object, expiresIn: number = 0): Promise<void> {
        if(DEBUG_ADAPTER) console.debug('adapter upsert', this.key(id), payload);

        const key = this.key(id);

        const multi = cache.multi();

        multi.call('JSON.SET', key, '.', JSON.stringify(payload));

        if (expiresIn) {
            multi.expire(key, expiresIn);
        }

        await multi.exec();
    }

    /**
     *
     * Return previously stored instance of an object.
     *
     * @return {Promise<any | undefined>} Promise fulfilled with what was previously stored for the id (when found and
     * not dropped yet due to expiration) or falsy value when not found anymore. Rejected with error
     * when encountered.
     * @param {string} id Identifier of object
     *
     */
    async find(id: string): Promise<any | undefined> {
        let item = undefined;

        // This isn't used, but it's kept as a reminder on how specialist models can be handled
        /* if(this.model==='Client') {
            item = await Client.find(id);
            return item;
        }
         */

        const key = this.key(id);
        item = await cache.call('JSON.GET', key);

        if(typeof item !== 'string') return undefined;
        return JSON.parse(item);
    }

    /**
     *
     * Destroy/Drop/Remove a stored oidc-provider model. Future finds for this id should be fulfilled
     * with falsy values.
     *
     * @return {Promise<void>} Promise fulfilled when the operation succeeded. Rejected with error when encountered.
     * @param {string} id Identifier of object
     *
     */
    async destroy(id: string): Promise<void> {
        const key = this.key(id);
        await cache.del(key);
    }
}

export default PersistanceAdapter;
