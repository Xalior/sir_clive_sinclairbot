import {z} from 'zod';

const fragments: Record<string, z.ZodObject<any>> = {};
let validatedEnv: Record<string, unknown> | null = null;

export function registerPluginEnvSchema(pluginName: string, schema: z.ZodObject<any>): void {
    if (pluginName in fragments) {
        throw new Error(`Plugin env schema already registered for "${pluginName}"`);
    }
    fragments[pluginName] = schema;
}

export function validateAllPluginEnv(): void {
    if (validatedEnv !== null) return;

    const keyOwners: Record<string, string> = {};
    const mergedShape: Record<string, z.ZodTypeAny> = {};
    for (const [pluginName, schema] of Object.entries(fragments)) {
        for (const [key, fieldSchema] of Object.entries(schema.shape)) {
            if (key in keyOwners) {
                throw new Error(
                    `Plugin env key collision: "${key}" is declared by both ` +
                    `"${keyOwners[key]}" and "${pluginName}"`
                );
            }
            keyOwners[key] = pluginName;
            mergedShape[key] = fieldSchema as z.ZodTypeAny;
        }
    }

    const merged = z.object(mergedShape);
    const result = merged.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid plugin environment variables:');
        for (const issue of result.error.issues) {
            console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
        }
        process.exit(1);
    }

    validatedEnv = result.data as Record<string, unknown>;
}
