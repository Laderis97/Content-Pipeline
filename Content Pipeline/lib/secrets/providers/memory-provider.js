class MemorySecretsProvider {
    constructor(initial = {}) {
        this.store = new Map(Object.entries(initial));
    }

    async getSecret(key) {
        return this.store.has(key) ? this.store.get(key) : undefined;
    }

    async setSecret(key, value) {
        this.store.set(key, value);
        return true;
    }

    async rotateSecret(key, generatorFn) {
        const newValue = await Promise.resolve(generatorFn());
        this.store.set(key, newValue);
        return newValue;
    }
}

module.exports = { MemorySecretsProvider };
