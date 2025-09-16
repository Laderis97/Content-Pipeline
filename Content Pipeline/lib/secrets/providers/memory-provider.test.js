const { MemorySecretsProvider } = require('./memory-provider');
const { SecretsManager } = require('../secrets-manager');

describe('MemorySecretsProvider', () => {
    test('get/set works', async () => {
        const p = new MemorySecretsProvider();
        await p.setSecret('KEY', 'VALUE');
        const v = await p.getSecret('KEY');
        expect(v).toBe('VALUE');
    });

    test('rotate updates value', async () => {
        const p = new MemorySecretsProvider({ ROTATE_ME: 'old' });
        const newV = await p.rotateSecret('ROTATE_ME', () => 'new');
        expect(newV).toBe('new');
        expect(await p.getSecret('ROTATE_ME')).toBe('new');
    });

    test('integrates with SecretsManager', async () => {
        const provider = new MemorySecretsProvider({ API_TOKEN: 'abc123' });
        const sm = new SecretsManager({ provider, cacheTtlMs: 100 });
        const v1 = await sm.getSecret('API_TOKEN');
        expect(v1).toBe('abc123');
        await provider.setSecret('API_TOKEN', 'xyz789');
        // still cached
        const v2 = await sm.getSecret('API_TOKEN');
        expect(v2).toBe('abc123');
    });
});
