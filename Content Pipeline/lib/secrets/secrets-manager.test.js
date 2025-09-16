const { SecretsManager } = require('./secrets-manager');

describe('SecretsManager', () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
        process.env = { ...ORIGINAL_ENV };
        delete process.env.TEST_SECRET;
        delete process.env.ANOTHER_SECRET;
    });

    afterEach(() => {
        jest.useRealTimers();
        process.env = ORIGINAL_ENV;
    });

    test('returns env value when provider is absent', async () => {
        process.env.TEST_SECRET = 'env-value';
        const sm = new SecretsManager();
        const value = await sm.getSecret('TEST_SECRET');
        expect(value).toBe('env-value');
    });

    test('uses provider first then falls back to env', async () => {
        process.env.TEST_SECRET = 'env-value';
        const provider = { getSecret: jest.fn().mockResolvedValue('provider-value') };
        const sm = new SecretsManager({ provider });
        const value = await sm.getSecret('TEST_SECRET');
        expect(provider.getSecret).toHaveBeenCalledWith('TEST_SECRET', {});
        expect(value).toBe('provider-value');
    });

    test('falls back to defaultValue when not found', async () => {
        const sm = new SecretsManager();
        const value = await sm.getSecret('MISSING', { defaultValue: 'default' });
        expect(value).toBe('default');
    });

    test('throws when required secret missing', async () => {
        const sm = new SecretsManager();
        await expect(sm.getRequiredSecret('MISSING')).rejects.toThrow('Required secret missing or empty: MISSING');
    });

    test('caches values with ttl', async () => {
        process.env.TEST_SECRET = 'env-value';
        const sm = new SecretsManager({ cacheTtlMs: 1000 });
        const v1 = await sm.getSecret('TEST_SECRET');
        expect(v1).toBe('env-value');

        process.env.TEST_SECRET = 'changed';
        const v2 = await sm.getSecret('TEST_SECRET');
        expect(v2).toBe('env-value'); // still cached

        jest.advanceTimersByTime(1001);
        const v3 = await sm.getSecret('TEST_SECRET');
        expect(v3).toBe('changed'); // cache expired
    });

    test('validateSchema returns missing required keys', async () => {
        const sm = new SecretsManager();
        sm.setSchema({
            WP_USERNAME: { required: true },
            WP_APP_PASSWORD: { required: true },
            OPTIONAL_FLAG: { required: false }
        });
        process.env.WP_USERNAME = 'user';
        const result = await sm.validateSchema();
        expect(result.valid).toBe(false);
        expect(result.missing).toEqual(['WP_APP_PASSWORD']);
    });

    test('validateSchema passes when all required present', async () => {
        const sm = new SecretsManager();
        sm.setSchema({
            WP_USERNAME: { required: true },
            WP_APP_PASSWORD: { required: true }
        });
        process.env.WP_USERNAME = 'user';
        process.env.WP_APP_PASSWORD = 'pass';
        const result = await sm.validateSchema();
        expect(result.valid).toBe(true);
        expect(result.missing).toEqual([]);
    });
});
