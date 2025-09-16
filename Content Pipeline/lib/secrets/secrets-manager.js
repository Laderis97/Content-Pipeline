const fs = require('fs');
const path = require('path');
require('dotenv').config();

class SecretsManager {
    constructor(options = {}) {
        this.provider = options.provider || null; // pluggable cloud provider
        this.cacheTtlMs = options.cacheTtlMs || 5 * 60 * 1000; // 5 minutes
        this.cache = new Map(); // key -> { value, expiresAt }
        this.schema = options.schema || {}; // optional schema for required keys
        this.environment = options.environment || process.env.NODE_ENV || 'development';
    }

    async getSecret(key, options = {}) {
        const now = Date.now();
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > now) {
            return cached.value;
        }

        // 1) Provider
        if (this.provider && typeof this.provider.getSecret === 'function') {
            try {
                const value = await this.provider.getSecret(key, options);
                if (value !== undefined && value !== null && value !== '') {
                    this._setCache(key, value, options.ttlMs);
                    return value;
                }
            } catch (err) {
                // fall through to env
            }
        }

        // 2) Environment (.env already loaded by dotenv)
        const envKey = options.envKey || key;
        const envValue = process.env[envKey];
        if (envValue !== undefined) {
            this._setCache(key, envValue, options.ttlMs);
            return envValue;
        }

        // 3) Optional default
        if (Object.prototype.hasOwnProperty.call(options, 'defaultValue')) {
            this._setCache(key, options.defaultValue, options.ttlMs);
            return options.defaultValue;
        }

        throw new Error(`Secret not found: ${key}`);
    }

    async getRequiredSecret(key, options = {}) {
        try {
            const value = await this.getSecret(key, options);
            if (value === undefined || value === null || value === '') {
                throw new Error(`Required secret missing or empty: ${key}`);
            }
            return value;
        } catch (err) {
            // Normalize to required-secret error
            throw new Error(`Required secret missing or empty: ${key}`);
        }
    }

    setSchema(schema) {
        this.schema = schema || {};
    }

    async validateSchema() {
        const missing = [];
        for (const [key, rule] of Object.entries(this.schema)) {
            if (rule?.required) {
                try {
                    const value = await this.getSecret(key);
                    if (value === undefined || value === null || value === '') {
                        missing.push(key);
                    }
                } catch (_) {
                    missing.push(key);
                }
            }
        }
        return { valid: missing.length === 0, missing };
    }

    clearCache(key) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    _setCache(key, value, ttlMs) {
        const ttl = typeof ttlMs === 'number' ? ttlMs : this.cacheTtlMs;
        this.cache.set(key, { value, expiresAt: Date.now() + ttl });
    }
}

module.exports = { SecretsManager };
