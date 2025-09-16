class SensitiveDataRedactor {
    constructor(options = {}) {
        this.redactionPatterns = [
            // API Keys and tokens
            /(api[_-]?key|token|secret|password|passwd|pwd)\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
            /(authorization|auth)\s*:\s*["']?([^"'\s]+)["']?/gi,
            /(bearer|basic)\s+([a-zA-Z0-9+/=]+)/gi,
            
            // WordPress credentials
            /(username|user)\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
            /(app[_-]?password|app_password)\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
            
            // Database credentials
            /(db[_-]?password|database[_-]?password)\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
            /(connection[_-]?string|conn[_-]?str)\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
            
            // URLs with credentials
            /(https?:\/\/[^:]+):([^@]+)@/gi,
            
            // Common sensitive patterns
            /(ssn|social[_-]?security)\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
            /(credit[_-]?card|cc)\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
            /(phone|tel)\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
            /(email|e[_-]?mail)\s*[:=]\s*["']?([^"'\s]+)["']?/gi
        ];

        this.customPatterns = options.customPatterns || [];
        this.redactionChar = options.redactionChar || '*';
        this.redactionLength = options.redactionLength || 8;
        this.preserveLength = options.preserveLength || false;
        
        // Combine default and custom patterns
        this.allPatterns = [...this.redactionPatterns, ...this.customPatterns];
    }

    /**
     * Redact sensitive data from a string
     * @param {string} input - Input string to redact
     * @returns {string} Redacted string
     */
    redactString(input) {
        if (typeof input !== 'string') {
            return input;
        }

        let redacted = input;

        this.allPatterns.forEach(pattern => {
            redacted = redacted.replace(pattern, (match, key, value) => {
                if (value) {
                    const redactedValue = this._redactValue(value);
                    return match.replace(value, redactedValue);
                }
                return match;
            });
        });

        return redacted;
    }

    /**
     * Redact sensitive data from an object
     * @param {Object} obj - Object to redact
     * @param {Array} sensitiveKeys - Keys to redact (optional)
     * @returns {Object} Redacted object
     */
    redactObject(obj, sensitiveKeys = []) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        const redacted = Array.isArray(obj) ? [] : {};

        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            
            // Check if key is in sensitive keys list
            const isSensitiveKey = sensitiveKeys.some(sensitiveKey => 
                lowerKey.includes(sensitiveKey.toLowerCase())
            );

            // Check if key matches common sensitive patterns
            const isCommonSensitive = this._isCommonSensitiveKey(lowerKey);

            if (isSensitiveKey || isCommonSensitive) {
                redacted[key] = this._redactValue(value);
            } else if (typeof value === 'string') {
                redacted[key] = this.redactString(value);
            } else if (typeof value === 'object' && value !== null) {
                redacted[key] = this.redactObject(value, sensitiveKeys);
            } else {
                redacted[key] = value;
            }
        }

        return redacted;
    }

    /**
     * Redact sensitive data from log metadata
     * @param {Object} meta - Log metadata to redact
     * @returns {Object} Redacted metadata
     */
    redactLogMeta(meta) {
        const sensitiveKeys = [
            'password', 'secret', 'token', 'key', 'auth', 'credential',
            'username', 'user', 'email', 'phone', 'ssn', 'credit',
            'api_key', 'app_password', 'db_password', 'connection_string'
        ];

        return this.redactObject(meta, sensitiveKeys);
    }

    /**
     * Add a custom redaction pattern
     * @param {RegExp} pattern - Regular expression pattern
     */
    addPattern(pattern) {
        if (pattern instanceof RegExp) {
            this.customPatterns.push(pattern);
            this.allPatterns.push(pattern);
        } else {
            throw new Error('Pattern must be a RegExp instance');
        }
    }

    /**
     * Remove a custom redaction pattern
     * @param {RegExp} pattern - Pattern to remove
     */
    removePattern(pattern) {
        const index = this.customPatterns.indexOf(pattern);
        if (index > -1) {
            this.customPatterns.splice(index, 1);
            this.allPatterns.splice(this.allPatterns.indexOf(pattern), 1);
        }
    }

    /**
     * Test if a key is commonly sensitive
     * @private
     */
    _isCommonSensitiveKey(key) {
        const sensitiveKeyPatterns = [
            /password/i, /secret/i, /token/i, /key/i, /auth/i,
            /credential/i, /username/i, /user/i, /email/i, /phone/i,
            /ssn/i, /credit/i, /api[_-]?key/i, /app[_-]?password/i,
            /db[_-]?password/i, /connection[_-]?string/i
        ];

        return sensitiveKeyPatterns.some(pattern => pattern.test(key));
    }

    /**
     * Redact a value based on configuration
     * @private
     */
    _redactValue(value) {
        if (value === null || value === undefined) {
            return value;
        }
        
        if (typeof value !== 'string') {
            return '[REDACTED]';
        }

        if (this.preserveLength) {
            const length = Math.min(value.length, this.redactionLength);
            return this.redactionChar.repeat(length);
        } else {
            return this.redactionChar.repeat(this.redactionLength);
        }
    }

    /**
     * Get redaction statistics
     * @returns {Object} Redaction statistics
     */
    getStats() {
        return {
            totalPatterns: this.allPatterns.length,
            customPatterns: this.customPatterns.length,
            defaultPatterns: this.redactionPatterns.length,
            redactionChar: this.redactionChar,
            redactionLength: this.redactionLength,
            preserveLength: this.preserveLength
        };
    }
}

module.exports = SensitiveDataRedactor;
